import test from 'node:test';
import assert from 'node:assert/strict';
import {parseRange,reserve} from '../cloudflare/policy.js';
test('音频分段处理和非法范围',()=>{
 assert.deepEqual(parseRange('bytes=0-0',100),{offset:0,length:1});
 assert.deepEqual(parseRange('bytes=90-',100),{offset:90,length:10});
 assert.deepEqual(parseRange('bytes=-10',100),{offset:90,length:10});
 assert.deepEqual(parseRange('bytes=90-999',100),{offset:90,length:10});
 for(const value of ['bytes=100-','bytes=10-9','bytes=-0','bytes=-','bytes=0-1,3-4','bytes=999999999999999999999-']) assert.throws(()=>parseRange(value,100));
});
test('额度边界、日重置和月重置',()=>{
 const now='2026-09-22T00:00:00Z';
 const old={day:'2026-09-22',month:'2026-09',daily:29999,monthly:999999};
 const last=reserve(old,now); assert.equal(last.daily,30000);assert.equal(last.monthly,1000000);
 assert.equal(reserve(last,now),null);
 assert.equal(reserve(last,'2026-09-23T00:00:00Z'),null);
 assert.deepEqual(reserve(last,'2026-10-01T00:00:00Z'),{day:'2026-10-01',month:'2026-10',daily:1,monthly:1});
 assert.equal(reserve({...old,daily:30000,monthly:10},now),null);
});
