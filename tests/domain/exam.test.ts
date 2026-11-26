import { describe, expect, it } from 'vitest';
import {
  advanceSection,
  canGoTo,
  canPlayAudio,
  createAttempt,
  currentQuestionId,
  goTo,
  isLastQuestion,
  isLastSection,
  isListeningSection,
  isTimeUp,
  recordAudioPlay,
  setAnswer,
  tick,
  unansweredInSection,
} from '../../src/domain/exam';
import type { ExamAttempt } from '../../src/domain/types';
import { examOf, makeBundle } from '../helpers';

const exam = examOf(makeBundle(3)); // 4 セクション × 3 問
const start = () => createAttempt(exam, '2026-01-01T00:00:00Z');
const LISTENING = 2;
const inListening = (questionIndex = 0): ExamAttempt => ({
  ...start(),
  sectionIndex: LISTENING,
  questionIndex,
});

describe('createAttempt', () => {
  it('最初のセクションの最初の問題から、制限時間いっぱいで始まる', () => {
    const attempt = start();
    expect(attempt.sectionIndex).toBe(0);
    expect(attempt.questionIndex).toBe(0);
    expect(attempt.remainingSec).toBe(exam.durationSec);
    expect(currentQuestionId(exam, attempt)).toBe('voc-0001');
  });
});

describe('セクション内の移動', () => {
  it('聴解以外は自由に行き来できる (BR-E4)', () => {
    const attempt = { ...start(), questionIndex: 2 };
    expect(canGoTo(exam, attempt, 0)).toBe(true);
    expect(canGoTo(exam, attempt, 1)).toBe(true);
    expect(goTo(exam, attempt, 0).questionIndex).toBe(0);
  });

  it('範囲外と現在位置には移動できない', () => {
    const attempt = start();
    expect(canGoTo(exam, attempt, -1)).toBe(false);
    expect(canGoTo(exam, attempt, 3)).toBe(false);
    expect(canGoTo(exam, attempt, 0)).toBe(false);
    expect(canGoTo(exam, attempt, 1.5)).toBe(false);
  });

  it('聴解では前の問題に戻れない (BR-E5)', () => {
    const attempt = inListening(1);
    expect(isListeningSection(exam, attempt)).toBe(true);
    expect(canGoTo(exam, attempt, 0)).toBe(false);
    expect(goTo(exam, attempt, 0)).toBe(attempt);
  });

  it('聴解では次の問題にだけ進める (BR-E5)', () => {
    const attempt = inListening(0);
    expect(canGoTo(exam, attempt, 1)).toBe(true);
    expect(canGoTo(exam, attempt, 2)).toBe(false);
    expect(goTo(exam, attempt, 1).questionIndex).toBe(1);
  });

  it('最後の問題かどうかを判定できる', () => {
    expect(isLastQuestion(exam, start())).toBe(false);
    expect(isLastQuestion(exam, { ...start(), questionIndex: 2 })).toBe(true);
  });
});

describe('セクションの進行 (BR-E7)', () => {
  it('次のセクションの最初の問題に進む', () => {
    const next = advanceSection(exam, { ...start(), questionIndex: 2 });
    expect(next?.sectionIndex).toBe(1);
    expect(next?.questionIndex).toBe(0);
  });

  it('前のセクションの問題には移動できない', () => {
    const next = advanceSection(exam, start())!;
    // canGoTo が扱うのは現在のセクションの中だけ
    expect(currentQuestionId(exam, next)).toBe('con-0001');
    expect(currentQuestionId(exam, goTo(exam, next, 2))).toBe('con-0003');
  });

  it('最後のセクションでは null を返す(試験の終了)', () => {
    const last = { ...start(), sectionIndex: 3 };
    expect(isLastSection(exam, last)).toBe(true);
    expect(advanceSection(exam, last)).toBeNull();
  });
});

describe('解答', () => {
  it('表示中の問題に解答でき、変更もできる', () => {
    let attempt = setAnswer(exam, start(), 2);
    expect(attempt.answers).toEqual({ 'voc-0001': 2 });
    attempt = setAnswer(exam, attempt, 0);
    expect(attempt.answers).toEqual({ 'voc-0001': 0 });
  });

  it('セクション内の未解答の数を数える', () => {
    const attempt = setAnswer(exam, start(), 1);
    expect(unansweredInSection(exam, attempt)).toBe(2);
  });
});

describe('音声の再生', () => {
  it('模擬試験では 2 回まで。3 回目は再生できない (BR-E6)', () => {
    expect(canPlayAudio(0, 'exam')).toBe(true);
    expect(canPlayAudio(1, 'exam')).toBe(true);
    expect(canPlayAudio(2, 'exam')).toBe(false);
  });

  it('練習と振り返りでは何度でも再生できる (BR-P4)', () => {
    expect(canPlayAudio(99, 'practice')).toBe(true);
    expect(canPlayAudio(99, 'review')).toBe(true);
  });

  it('再生回数を問題ごとに記録する', () => {
    let attempt = recordAudioPlay(inListening(), 'lis-0001');
    attempt = recordAudioPlay(attempt, 'lis-0001');
    attempt = recordAudioPlay(attempt, 'lis-0002');
    expect(attempt.audioPlays).toEqual({ 'lis-0001': 2, 'lis-0002': 1 });
  });
});

describe('残り時間', () => {
  it('経過した分だけ減り、0 より小さくならない', () => {
    expect(tick(start(), 1).remainingSec).toBe(exam.durationSec - 1);
    expect(tick(start(), exam.durationSec + 100).remainingSec).toBe(0);
  });

  it('負の経過時間では増えない', () => {
    expect(tick(start(), -5).remainingSec).toBe(exam.durationSec);
  });

  it('0 になったら時間切れ (BR-E9)', () => {
    expect(isTimeUp(start())).toBe(false);
    expect(isTimeUp(tick(start(), exam.durationSec))).toBe(true);
  });
});
