const pagesHost = 'english-pod-web.pages.dev';

export default {
  async fetch(request) {
    const original = new URL(request.url);
    const target = new URL(request.url);
    target.hostname = pagesHost;
    target.protocol = 'https:';
    target.port = '';

    const response = await fetch(new Request(target, request));
    const headers = new Headers(response.headers);
    const location = headers.get('Location');
    if (location) {
      const redirect = new URL(location, target);
      if (redirect.hostname === pagesHost) {
        redirect.hostname = original.hostname;
        redirect.protocol = original.protocol;
        headers.set('Location', redirect.toString());
      }
    }
    headers.set('X-English-Edge-Source', 'pages');
    return new Response(response.body, {status: response.status, statusText: response.statusText, headers});
  },
};
