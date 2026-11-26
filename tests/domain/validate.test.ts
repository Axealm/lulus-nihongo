import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/domain/validate';
import type { ContentBundle } from '../../src/domain/types';
import { clone, makeBundle } from '../helpers';

/** 正しいデータを 1 か所だけ壊して、検出されたルールの一覧を返す */
function rulesAfter(mutate: (bundle: ContentBundle) => void, fileExists?: (p: string) => boolean) {
  const bundle = clone(makeBundle());
  mutate(bundle);
  return validateContent(bundle, fileExists).map((v) => v.rule);
}

describe('validateContent', () => {
  it('正しいデータは違反なし', () => {
    expect(validateContent(makeBundle(), () => true)).toEqual([]);
  });

  it('BR-D1: 問題 ID の重複', () => {
    expect(rulesAfter((b) => (b.questions[1]!.id = b.questions[0]!.id))).toContain('BR-D1');
  });

  it('BR-D1: 接頭辞がセクションと合わない', () => {
    const rules = rulesAfter((b) => {
      b.questions[0]!.id = 'rea-9999';
      b.translations.id![0]!.id = 'rea-9999';
      b.sets[0]!.questionIds[0] = 'rea-9999';
      b.exams[0]!.sections[0]!.questionIds[0] = 'rea-9999';
    });
    expect(rules).toEqual(['BR-D1']);
  });

  it('BR-D2: 選択肢の数', () => {
    expect(rulesAfter((b) => (b.questions[0]!.choices = ['a', 'b']))).toContain('BR-D2');
    expect(rulesAfter((b) => (b.questions[0]!.choices = ['a', 'b', 'c', 'd', 'e']))).toContain('BR-D2');
  });

  it('BR-D2: 選択肢の重複', () => {
    expect(rulesAfter((b) => (b.questions[0]!.choices = ['a', 'a', 'b', 'c']))).toEqual(['BR-D2']);
  });

  it('BR-D3: answerIndex が範囲外', () => {
    expect(rulesAfter((b) => (b.questions[0]!.answerIndex = 4))).toEqual(['BR-D3']);
    expect(rulesAfter((b) => (b.questions[0]!.answerIndex = -1))).toEqual(['BR-D3']);
  });

  it('BR-D4: 聴解に音声や文字起こしがない', () => {
    const listening = (b: ContentBundle) => b.questions.find((q) => q.section === 'listening')!;
    expect(rulesAfter((b) => delete listening(b).audio)).toEqual(['BR-D4']);
    expect(rulesAfter((b) => delete listening(b).transcript)).toEqual(['BR-D4']);
  });

  it('BR-D5: セクションに合わないカテゴリ', () => {
    expect(rulesAfter((b) => (b.questions[0]!.category = 'grammar'))).toEqual(['BR-D5']);
  });

  it('BR-D6: 現地語データがない・空', () => {
    expect(rulesAfter((b) => b.translations.id!.shift())).toEqual(['BR-D6']);
    expect(rulesAfter((b) => (b.translations.id![0]!.explanation = ' '))).toEqual(['BR-D6']);
    expect(rulesAfter((b) => (b.translations.id![0]!.instruction = ''))).toEqual(['BR-D6']);
  });

  it('BR-D6: 追加した言語にも全問分の現地語データが必要', () => {
    expect(rulesAfter((b) => (b.translations.ne = [b.translations.id![0]!]))).toContain('BR-D6');
  });

  it('BR-D7: 存在しない問題を参照している', () => {
    expect(rulesAfter((b) => b.sets[0]!.questionIds.push('voc-9999'))).toEqual(['BR-D7']);
  });

  it('BR-D7: セクションが一致しない', () => {
    expect(rulesAfter((b) => b.sets[0]!.questionIds.push('rea-0001'))).toEqual(['BR-D7']);
  });

  it('BR-D8: セクションの順番と数', () => {
    expect(rulesAfter((b) => b.exams[0]!.sections.reverse())).toContain('BR-D8');
    expect(rulesAfter((b) => b.exams[0]!.sections.pop())).toContain('BR-D8');
  });

  it('BR-D8: 同じ問題が 2 回出る', () => {
    expect(rulesAfter((b) => b.exams[0]!.sections[0]!.questionIds.push('voc-0001'))).toEqual([
      'BR-D8',
    ]);
  });

  it('BR-D9: 音声ファイルがない', () => {
    expect(rulesAfter(() => undefined, () => false)).toEqual(['BR-D9', 'BR-D9']);
  });

  it('BR-D10: 同じ内容の問題が 2 回ある', () => {
    expect(rulesAfter((b) => (b.questions[1]!.prompt = b.questions[0]!.prompt))).toEqual([
      'BR-D10',
    ]);
  });

  it('BR-D10: 同じ文章に別の設問が付くのは構わない', () => {
    const rules = rulesAfter((b) => {
      const reading = b.questions.filter((q) => q.section === 'reading');
      reading[0]!.passage = 'おなじ ぶんしょう';
      reading[1]!.passage = 'おなじ ぶんしょう';
    });
    expect(rules).toEqual([]);
  });

  it('違反には対象の ID と説明が付く', () => {
    const bundle = clone(makeBundle());
    bundle.questions[0]!.answerIndex = 9;
    const [violation] = validateContent(bundle);
    expect(violation).toMatchObject({ rule: 'BR-D3', target: 'voc-0001' });
    expect(violation!.message.length).toBeGreaterThan(0);
  });
});
