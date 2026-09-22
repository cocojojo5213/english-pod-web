import { DurableObject } from 'cloudflare:workers';
import {parseRange, reserve} from './policy.js';

// 全球共享一个持久化计数器；事务成功扣额后才允许一次 R2 GET。
export class AudioBudget extends DurableObject {
  async fetch() {
    const allowed = await this.ctx.storage.transaction(async tx => {
      const next = reserve(await tx.get('usage'));
      if (!next) return false;
      await tx.put('usage', next);
      return true;
    });
    return new Response(null, {status:allowed ? 204 : 429});
  }
}
export default {
  async fetch(request, env) {
    if (!['GET','HEAD'].includes(request.method)) return new Response(null,{status:405,headers:{Allow:'GET, HEAD'}});
    const url = new URL(request.url);
    const id = url.pathname.match(/^\/media\/([a-z]+-\d{2})$/)?.[1];
    const size = JSON.parse(env.COURSES)[id];
    if (!size) return new Response(null,{status:404});
    const rangeHeader = request.headers.get('Range');
    let range;
    try { range = request.method === 'HEAD' ? null : parseRange(rangeHeader,size); }
    catch { return new Response(null,{status:416,headers:{'Content-Range':`bytes */${size}`}}); }
    const cacheKey = new Request(`${url.origin}${url.pathname}${rangeHeader ? `?range=${encodeURIComponent(rangeHeader)}` : ''}`, {method:'GET'});
    const cache = caches.default;
    const cached = await cache.match(cacheKey);
    if (cached) return request.method === 'HEAD' ? new Response(null,{status:cached.status,headers:cached.headers}) : cached;
    const headers = new Headers({'Content-Type':'audio/mp4','Accept-Ranges':'bytes','Cache-Control':'public, max-age=86400, s-maxage=604800','Content-Length':String(range?.length ?? size),'X-Audio-Source':'cloudflare-r2','X-Content-Type-Options':'nosniff'});
    if (request.method === 'HEAD') return new Response(null,{headers});
    if (range) headers.set('Content-Range',`bytes ${range.offset}-${range.offset+range.length-1}/${size}`);
    try {
      const quota = await env.BUDGET.get(env.BUDGET.idFromName('english-pod-global')).fetch('https://budget/');
      if (!quota.ok) return new Response('音频访问额度已用完，请稍后再试。',{status:429,headers:{'Retry-After':'3600','Cache-Control':'no-store'}});
      const object = await env.AUDIO.get(`v1/${id}.m4a`,range ? {range} : {});
      if (!object) return new Response(null,{status:404});
      if (object.size !== size) { await object.body.cancel(); throw new Error('size'); }
      headers.set('ETag',object.httpEtag);
      const response = new Response(object.body,{status:range ? 206 : 200,headers});
      await cache.put(cacheKey,response.clone());
      return response;
    } catch {
      // 计数或存储故障时关闭入口，不回退本机，也不绕过额度。
      return new Response('音频暂时无法读取，请稍后重试。',{status:503,headers:{'Cache-Control':'no-store'}});
    }
  }
};
