import { readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const files = execFileSync('git', ['ls-files', '*.ts', '*.tsx', '*.md'], { encoding: 'utf8' }).trim().split('\n').filter(Boolean);
const prohibited = ['female users', 'uterus owners', 'breastfeeding mothers', 'all women'];
const errors = [];
for (const file of files.filter((name) => !name.startsWith('test/') && name !== 'src/domain.ts')) {
  const text = readFileSync(file, 'utf8').toLowerCase();
  for (const phrase of prohibited) if (text.includes(phrase)) errors.push(`${file}: prohibited phrase "${phrase}"`);
}
if (errors.length) { console.error(errors.join('\n')); process.exit(1); }
console.log(`Inclusive-language check passed (${files.length} files scanned).`);
