import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import {parseRange,reserve} from '../cloudflare/policy.js';
const source=(await readFile(new URL('../cloudflare/audio-worker.js',import.meta.url),'utf8')).replace(/^import .*;\n/gm,'').replace('export class AudioBudget','class AudioBudget').replace('export default','globalThis.worker =')+'\nglobalThis.Budget=AudioBudget;';
const box={DurableObject:class{constructor(ctx){this.ctx=ctx}},parseRange,reserve,Response,Headers,URL,Request,caches:{default:{match:async()=>null,put:async()=>{}}}};
vm.runInNewContext(source,box);
test('并发扣额只放行剩余次数',async()=>{
 const now=new Date().toISOString();let state={day:now.slice(0,10),month:now.slice(0,7),daily:29999,monthly:50};
 let queue=Promise.resolve();
 const storage={transaction(fn){const next=queue.then(()=>fn({get:async()=>state,put:async(_,v)=>{state=v}}));queue=next;return next}};
 const b=new box.Budget({storage});const rs=await Promise.all(Array.from({length:20},()=>b.fetch()));
 assert.equal(rs.filter(r=>r.status===204).length,1);assert.equal(state.daily,30000);
});
test('配额拒绝和故障不读R2，HEAD不扣额，分段输出正确',async()=>{
 let reads=0,quota=0,mode=429;
 const env={COURSES:'{"beginner-01":10}',BUDGET:{idFromName:()=>1,get:()=>({fetch:async()=>{quota++;if(mode===503)throw Error();return new Response(null,{status:mode})}})},AUDIO:{get:async()=>{reads++;return {size:10,httpEtag:'"test"',body:new Uint8Array([1,2])}}}};
 const req=()=>new Request('https://example.com/media/beginner-01',{headers:{Range:'bytes=0-1'}});
 assert.equal((await box.worker.fetch(req(),env)).status,429);assert.equal(reads,0);
 mode=503;assert.equal((await box.worker.fetch(req(),env)).status,503);assert.equal(reads,0);
 const before=quota;assert.equal((await box.worker.fetch(new Request(req().url,{method:'HEAD'}),env)).status,200);assert.equal(quota,before);
 mode=204;const response=await box.worker.fetch(req(),env);assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 0-1/10');assert.equal(reads,1);
});
