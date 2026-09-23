import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.resolve(process.env.DATA_ROOT || path.join(root, 'data'));
const output = path.join(root, 'dist', '_api_data');
const catalogPath = path.join(source, 'catalog.json');
if (!fs.existsSync(catalogPath)) {
  throw Error('Course data is missing: run npm run import or set DATA_ROOT to a prepared data directory');
}
const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));

if (!Array.isArray(catalog) || catalog.length === 0) throw Error('Course catalog is empty');
const ids = new Set();
const publicCatalog = catalog.map(({file, ...course}) => {
  if (!/^[a-z]+-\d{2}$/.test(course.id) || ids.has(course.id)) throw Error('Invalid or duplicate course ID');
  ids.add(course.id);
  return course;
});

fs.mkdirSync(path.join(output, 'courses'), {recursive: true});
for (const course of catalog) {
  const detail = JSON.parse(fs.readFileSync(path.join(source, 'courses', `${course.id}.json`), 'utf8'));
  if (detail.id !== course.id) throw Error(`Course detail ID mismatch: ${course.id}`);
  fs.writeFileSync(path.join(output, 'courses', `${course.id}.json`), JSON.stringify(detail));
}
fs.writeFileSync(path.join(output, 'courses.json'), JSON.stringify(publicCatalog));
fs.writeFileSync(path.join(output, 'health.json'), JSON.stringify({ok: true, courses: catalog.length}));
console.log(`Prepared Pages API assets for ${catalog.length} courses`);
