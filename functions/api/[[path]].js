const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'",
};
export const errorHeaders = {...securityHeaders, 'Cache-Control': 'no-store'};
const jsonHeaders = {...securityHeaders, 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'public, max-age=300'};

export async function onRequest({request, env}) {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    return new Response(null, {status: 405, headers: {...errorHeaders, Allow: 'GET, HEAD'}});
  }

  const pathname = new URL(request.url).pathname.replace(/\/$/, '');
  let assetPath;
  if (pathname === '/api/health') assetPath = '/_api_data/health.json';
  else if (pathname === '/api/courses') assetPath = '/_api_data/courses.json';
  else {
    const encodedId = pathname.match(/^\/api\/courses\/([^/]+)$/)?.[1];
    let id;
    try { id = decodeURIComponent(encodedId || ''); }
    catch { return new Response(null, {status: 404, headers: errorHeaders}); }
    if (!/^[a-z]+-\d{2}$/.test(id)) return new Response(null, {status: 404, headers: errorHeaders});
    assetPath = `/_api_data/courses/${id}.json`;
  }

  const asset = await env.ASSETS.fetch(new URL(assetPath, request.url));
  if (!asset.ok || !asset.headers.get('Content-Type')?.includes('application/json')) {
    return new Response(null, {status: 404, headers: errorHeaders});
  }
  const headers = new Headers(jsonHeaders);
  if (asset.headers.has('ETag')) headers.set('ETag', asset.headers.get('ETag'));
  return new Response(request.method === 'HEAD' ? null : asset.body, {status: 200, headers});
}
