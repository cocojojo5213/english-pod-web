// 根据本地已校验的文件大小解析单段 Range，不额外读取 R2 元数据。
export function parseRange(value, size) {
  if (!value) return null;
  const m = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!m || (!m[1] && !m[2])) throw new Error('range');
  const a = Number(m[1]), b = Number(m[2]);
  if (!Number.isSafeInteger(a) || !Number.isSafeInteger(b)) throw new Error('range');
  const start = m[1] ? a : Math.max(0, size - b);
  const end = m[1] && m[2] ? Math.min(b, size - 1) : size - 1;
  if (start >= size || end < start || (!m[1] && b === 0)) throw new Error('range');
  return {offset:start, length:end-start+1};
}
export function reserve(old = {}, now = new Date().toISOString()) {
  const day = now.slice(0,10), month = now.slice(0,7);
  const daily = old.day === day ? old.daily : 0;
  const monthly = old.month === month ? old.monthly : 0;
  if (daily >= 30000 || monthly >= 1000000) return null;
  return {day,month,daily:daily+1,monthly:monthly+1};
}
