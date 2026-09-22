import express from 'express';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = process.env.DATA_ROOT || path.join(root, 'data');
const mediaRoot = process.env.MEDIA_ROOT || '/home/ubuntu/english pod';
const catalog = JSON.parse(fs.readFileSync(path.join(dataRoot, 'catalog.json'), 'utf8'));
const byId = new Map(catalog.map(c => [c.id, c]));
export const app = express();
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.set({'X-Content-Type-Options':'nosniff','Referrer-Policy':'strict-origin-when-cross-origin','X-Frame-Options':'DENY','Content-Security-Policy':"default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; media-src 'self'; connect-src 'self'; frame-ancestors 'none'"});
  next();
});
app.get('/api/health', (req,res) => res.json({ok:true,courses:catalog.length}));
app.get('/api/courses', (req,res) => res.json(catalog.map(({file,...c})=>c)));
app.get('/api/courses/:id', (req,res) => {
  if (!byId.has(req.params.id)) return res.sendStatus(404);
  res.sendFile(path.join(dataRoot, 'courses', `${req.params.id}.json`));
});
app.get('/media/:id', (req,res) => {
  const course = byId.get(req.params.id);
  if (!course || !course.available) return res.sendStatus(404);
  res.set('Cache-Control','public, max-age=86400');
  res.sendFile(course.file, {root:mediaRoot, dotfiles:'deny'});
});
app.use('/api', (req,res) => res.sendStatus(404));
app.use(express.static(path.join(root,'dist'), {maxAge:'1h'}));
app.get('/{*rest}', (req,res) => res.sendFile(path.join(root,'dist/index.html')));
if (process.env.NODE_ENV !== 'test') app.listen(Number(process.env.PORT || 18341),'127.0.0.1',()=>console.log('English Pod 服务已启动'));
