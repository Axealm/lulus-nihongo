// 全問題を、人が読んで確認しやすい Markdown にまとめる(問題の中身の確認用)。
// 実行: npm run review  → content-review.md を作る
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const locale = process.argv[2] ?? 'id';

const readAll = (dir) =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ name, items: JSON.parse(readFileSync(join(dir, name), 'utf8')) }));

const translations = new Map(
  readAll(join(root, 'content', 'translations', locale)).flatMap((f) =>
    f.items.map((t) => [t.id, t]),
  ),
);

const quote = (text) =>
  text
    .split('\n')
    .map((line) => `> ${line}`)
    .join('\n');

const lines = [
  '# 問題の確認用シート',
  '',
  '全問題を読みやすく並べたもの。✅ が正解。`npm run review` で作り直せる。',
  '確認してほしい点: 日本語として自然か、正解が 1 つだけか、ほかの選択肢が正解になりえないか。',
  '',
];

let total = 0;
for (const file of readAll(join(root, 'content', 'questions'))) {
  lines.push(`## ${file.name}`, '');
  for (const q of file.items) {
    total += 1;
    const t = translations.get(q.id);
    lines.push(`### ${q.id}(${q.category} / ${q.level})`, '');
    if (t) lines.push(`設問(${locale}): ${t.instruction}`, '');
    if (q.passage) lines.push(quote(q.passage), '');
    if (q.transcript) lines.push('音声:', '', quote(q.transcript), '');
    lines.push(quote(q.prompt), '');
    q.choices.forEach((choice, i) => {
      lines.push(`${i + 1}. ${choice}${i === q.answerIndex ? ' ✅' : ''}`);
    });
    lines.push('');
    if (t) lines.push(`解説(${locale}): ${t.explanation}`, '');
  }
}

writeFileSync(join(root, 'content-review.md'), lines.join('\n'), 'utf8');
console.log(`content-review.md を作成しました(${total} 問)`);
