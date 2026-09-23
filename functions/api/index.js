import {errorHeaders} from './[[path]].js';

export function onRequest() {
  return new Response(null, {status: 404, headers: errorHeaders});
}
