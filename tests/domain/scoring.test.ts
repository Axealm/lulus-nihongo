import { describe, expect, it } from 'vitest';
import { bandFor, estimateScore, gradeExam, percent } from '../../src/domain/scoring';
import type { Answers } from '../../src/domain/types';
import { examOf, makeBundle, questionMap } from '../helpers';

describe('estimateScore (BR-S1)', () => {
  it('全問正解は 250 点、全問不正解は 10 点', () => {
    expect(estimateScore(50, 50)).toBe(250);
    expect(estimateScore(0, 50)).toBe(10);
  });

  it('50 問中 40 問の正解は 202 点', () => {
    expect(estimateScore(40, 50)).toBe(202);
  });

  it('問題数が 0 のときは最低点', () => {
    expect(estimateScore(0, 0)).toBe(10);
  });

  it('範囲外の正答数は丸める', () => {
    expect(estimateScore(60, 50)).toBe(250);
    expect(estimateScore(-1, 50)).toBe(10);
  });
});

describe('bandFor (BR-S2)', () => {
  it.each([
    [10, 'none'],
    [144, 'none'],
    [145, 'A1'],
    [174, 'A1'],
    [175, 'A2.1'],
    [199, 'A2.1'],
    [200, 'A2'],
    [250, 'A2'],
  ] as const)('%i 点は %s', (score, band) => {
    expect(bandFor(score)).toBe(band);
  });
});

describe('gradeExam', () => {
  const bundle = makeBundle(2); // 4 セクション × 2 問 = 8 問、正解はすべて 0 番
  const exam = examOf(bundle);
  const questions = questionMap(bundle);
  const allIds = bundle.questions.map((q) => q.id);

  it('全問正解', () => {
    const answers: Answers = Object.fromEntries(allIds.map((id) => [id, 0]));
    const result = gradeExam(exam, questions, answers, '2026-01-01T00:00:00Z');
    expect(result.estimatedScore).toBe(250);
    expect(result.band).toBe('A2');
    expect(result.sectionScores.every((s) => s.correct === 2 && s.total === 2)).toBe(true);
  });

  it('全問不正解', () => {
    const answers: Answers = Object.fromEntries(allIds.map((id) => [id, 1]));
    const result = gradeExam(exam, questions, answers, '2026-01-01T00:00:00Z');
    expect(result.estimatedScore).toBe(10);
    expect(result.band).toBe('none');
  });

  it('未解答は不正解として扱う (BR-E10)', () => {
    const result = gradeExam(exam, questions, { [allIds[0]!]: 0 }, '2026-01-01T00:00:00Z');
    const total = result.sectionScores.reduce((sum, s) => sum + s.correct, 0);
    expect(total).toBe(1);
    expect(result.estimatedScore).toBe(estimateScore(1, 8));
  });

  it('セクションごとに集計し、解答を結果に残す', () => {
    const answers: Answers = { 'voc-0001': 0, 'voc-0002': 3, 'lis-0001': 0 };
    const result = gradeExam(exam, questions, answers, '2026-01-01T00:00:00Z');
    expect(result.sectionScores).toEqual([
      { section: 'vocabulary', correct: 1, total: 2 },
      { section: 'conversation', correct: 0, total: 2 },
      { section: 'listening', correct: 1, total: 2 },
      { section: 'reading', correct: 0, total: 2 },
    ]);
    expect(result.answers).toEqual(answers);
    expect(result.examId).toBe(exam.id);
  });
});

describe('percent', () => {
  it('正答率を整数で返す', () => {
    expect(percent(1, 3)).toBe(33);
    expect(percent(0, 0)).toBe(0);
  });
});
