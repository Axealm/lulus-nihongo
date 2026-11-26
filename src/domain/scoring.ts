import type { Answers, Band, ExamBlueprint, ExamResult, Question, SectionScore } from './types';

export const SCORE_MIN = 10;
export const SCORE_MAX = 250;

/**
 * BR-S1: 目安の得点。本番は尺度得点で換算方法が非公開のため、正答率から直線で換算する。
 */
export function estimateScore(correct: number, total: number): number {
  if (total <= 0) return SCORE_MIN;
  const clamped = Math.min(Math.max(correct, 0), total);
  return Math.round(SCORE_MIN + ((SCORE_MAX - SCORE_MIN) * clamped) / total);
}

/** BR-S2: 目安の判定。基準点は本番と同じ */
export function bandFor(score: number): Band {
  if (score >= 200) return 'A2';
  if (score >= 175) return 'A2.1';
  if (score >= 145) return 'A1';
  return 'none';
}

/** 模擬試験を採点する。未解答は不正解として扱う(BR-E10) */
export function gradeExam(
  exam: ExamBlueprint,
  questions: ReadonlyMap<string, Question>,
  answers: Answers,
  finishedAt: string,
): ExamResult {
  const sectionScores: SectionScore[] = exam.sections.map((s) => {
    let correct = 0;
    for (const id of s.questionIds) {
      const q = questions.get(id);
      if (q && answers[id] === q.answerIndex) correct += 1;
    }
    return { section: s.section, correct, total: s.questionIds.length };
  });
  const correct = sectionScores.reduce((sum, s) => sum + s.correct, 0);
  const total = sectionScores.reduce((sum, s) => sum + s.total, 0);
  const estimatedScore = estimateScore(correct, total);
  return {
    examId: exam.id,
    finishedAt,
    sectionScores,
    estimatedScore,
    band: bandFor(estimatedScore),
    answers: { ...answers },
  };
}

export function percent(correct: number, total: number): number {
  return total <= 0 ? 0 : Math.round((correct / total) * 100);
}
