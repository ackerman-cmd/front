import { mkdir, copyFile, cp } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const output = resolve(root, 'dist');
await mkdir(output, { recursive: true });
for (const name of ['index.html', 'styles.css']) {
  await copyFile(resolve(root, name), resolve(output, name));
}
await cp(resolve(root, 'assets'), resolve(output, 'assets'), { recursive: true });
console.log('Готово: dist/. Проверка: npm run preview');
