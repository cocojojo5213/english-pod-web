import test from 'node:test';
import assert from 'node:assert/strict';
const base=process.env.TEST_URL||'http://127.0.0.1:18341';
test('课程资料、音频 Range 和安全边界',async()=>{
 const courses=await (await fetch(`${base}/api/courses`)).json();
 assert.equal(courses.length,111);assert.ok(courses.every(c=>c.available));
 assert.ok(courses.every(c=>!('file' in c)));
 for(const id of ['beginner-06','beginner-08','beginner-10']){
  const r=await fetch(`${base}/media/${id}`,{headers:{Range:'bytes=0-127'}});
  assert.equal(r.status,206);assert.equal((await r.arrayBuffer()).byteLength,128);
 }
 assert.equal((await fetch(`${base}/api/courses/unknown`)).status,404);
 assert.equal((await fetch(`${base}/media/unknown`)).status,404);
 const detail=await(await fetch(`${base}/api/courses/beginner-28`)).json();
 assert.ok(detail.notes.length>0);
 assert.ok(detail.notes.every(n=>n.start<n.end));
});
