import type { ExamAttempt, ExamBlueprint, ExamSection } from './types';

export type AudioMode = 'practice' | 'exam' | 'review';

/** BR-E6: 模擬試験では 1 問につき 2 回まで */
export const EXAM_AUDIO_LIMIT = 2;

export function createAttempt(exam: ExamBlueprint, startedAt: string): ExamAttempt {
  return {
    examId: exam.id,
    startedAt,
    remainingSec: exam.durationSec,
    sectionIndex: 0,
    questionIndex: 0,
    answers: {},
    audioPlays: {},
  };
}

export function currentSection(exam: ExamBlueprint, attempt: ExamAttempt): ExamSection | undefined {
  return exam.sections[attempt.sectionIndex];
}

export function currentQuestionId(exam: ExamBlueprint, attempt: ExamAttempt): string | undefined {
  return currentSection(exam, attempt)?.questionIds[attempt.questionIndex];
}

export function isListeningSection(exam: ExamBlueprint, attempt: ExamAttempt): boolean {
  return currentSection(exam, attempt)?.section === 'listening';
}

/**
 * セクション内の移動可否。
 * BR-E4: 聴解以外は自由に移動できる。BR-E5: 聴解は次の問題にしか進めない。
 * ほかのセクションの問題には、この関数では移動できない(BR-E7)。
 */
export function canGoTo(exam: ExamBlueprint, attempt: ExamAttempt, target: number): boolean {
  const section = currentSection(exam, attempt);
  if (!section) return false;
  if (!Number.isInteger(target) || target < 0 || target >= section.questionIds.length) return false;
  if (target === attempt.questionIndex) return false;
  if (section.section === 'listening') return target === attempt.questionIndex + 1;
  return true;
}

export function goTo(exam: ExamBlueprint, attempt: ExamAttempt, target: number): ExamAttempt {
  return canGoTo(exam, attempt, target) ? { ...attempt, questionIndex: target } : attempt;
}

export function isLastQuestion(exam: ExamBlueprint, attempt: ExamAttempt): boolean {
  const section = currentSection(exam, attempt);
  return !section || attempt.questionIndex >= section.questionIds.length - 1;
}

export function isLastSection(exam: ExamBlueprint, attempt: ExamAttempt): boolean {
  return attempt.sectionIndex >= exam.sections.length - 1;
}

/**
 * BR-E7: 次のセクションへ進む。戻る操作は用意しない。
 * 最後のセクションでは null を返す(試験の終了を意味する)。
 */
export function advanceSection(exam: ExamBlueprint, attempt: ExamAttempt): ExamAttempt | null {
  if (isLastSection(exam, attempt)) return null;
  return { ...attempt, sectionIndex: attempt.sectionIndex + 1, questionIndex: 0 };
}

/** いま表示している問題に解答する。ほかの問題の解答は変えられない */
export function setAnswer(exam: ExamBlueprint, attempt: ExamAttempt, choice: number): ExamAttempt {
  const id = currentQuestionId(exam, attempt);
  if (!id) return attempt;
  return { ...attempt, answers: { ...attempt.answers, [id]: choice } };
}

/** セクション内の未解答の問題数 */
export function unansweredInSection(exam: ExamBlueprint, attempt: ExamAttempt): number {
  const section = currentSection(exam, attempt);
  if (!section) return 0;
  return section.questionIds.filter((id) => attempt.answers[id] === undefined).length;
}

/** 再生回数の上限。null は無制限(BR-P4) */
export function audioLimit(mode: AudioMode): number | null {
  return mode === 'exam' ? EXAM_AUDIO_LIMIT : null;
}

export function canPlayAudio(plays: number, mode: AudioMode): boolean {
  const limit = audioLimit(mode);
  return limit === null || plays < limit;
}

export function recordAudioPlay(attempt: ExamAttempt, questionId: string): ExamAttempt {
  const plays = attempt.audioPlays[questionId] ?? 0;
  return { ...attempt, audioPlays: { ...attempt.audioPlays, [questionId]: plays + 1 } };
}

export function tick(attempt: ExamAttempt, elapsedSec: number): ExamAttempt {
  const elapsed = Math.max(0, elapsedSec);
  return { ...attempt, remainingSec: Math.max(0, attempt.remainingSec - elapsed) };
}

/** BR-E9 */
export function isTimeUp(attempt: ExamAttempt): boolean {
  return attempt.remainingSec <= 0;
}
