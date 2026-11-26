// 問題データの検証(BR-D1〜BR-D9)。違反があれば終了コード 1 で終わり、ビルドを止める。
// 実行: npm run validate
import { validateContent } from '../src/domain/validate';
import { loadContentFromDisk, publicFileExists } from './load-content';

const root = process.cwd();
const bundle = loadContentFromDisk(root);
const violations = validateContent(bundle, publicFileExists(root));

const locales = Object.keys(bundle.translations).join(', ');
console.log(
  `問題 ${bundle.questions.length} 問 / 練習セット ${bundle.sets.length} / 模擬試験 ${bundle.exams.length} / 言語 ${locales}`,
);

if (violations.length > 0) {
  console.error(`\n問題データに ${violations.length} 件の違反があります:`);
  for (const v of violations) {
    console.error(`  [${v.rule}] ${v.target}: ${v.message}`);
  }
  process.exit(1);
}

console.log('問題データの検証: 違反なし');
