import type {
  ContentBundle,
  ExamBlueprint,
  Question,
  QuestionTranslation,
  Section,
} from '../src/domain/types';
import { SECTIONS, SECTION_PREFIX } from '../src/domain/types';

const CATEGORY: Record<Section, string> = {
  vocabulary: 'word-meaning',
  conversation: 'grammar',
  listening: 'social',
  reading: 'comprehension',
};

/** 正解が常に 0 番の問題を作る */
export function makeQuestion(section: Section, n: number, overrides: Partial<Question> = {}): Question {
  const id = `${SECTION_PREFIX[section]}${String(n).padStart(4, '0')}`;
  return {
    id,
    section,
    category: CATEGORY[section],
    level: 'A1',
    prompt: `もんだい ${id}`,
    choices: ['せいかい', 'ちがう1', 'ちがう2', 'ちがう3'],
    answerIndex: 0,
    ...(section === 'listening'
      ? { audio: `audio/${id}.mp3`, transcript: 'おんな：こんにちは。' }
      : {}),
    ...overrides,
  };
}

export function makeTranslation(id: string): QuestionTranslation {
  return { id, instruction: `Instruksi ${id}`, explanation: `Pembahasan ${id}` };
}

/** 各セクション perSection 問の、検証を通る問題データ一式を作る */
export function makeBundle(perSection = 2): ContentBundle {
  const questions = SECTIONS.flatMap((section) =>
    Array.from({ length: perSection }, (_, i) => makeQuestion(section, i + 1)),
  );
  const idsOf = (section: Section) =>
    questions.filter((q) => q.section === section).map((q) => q.id);
  return {
    questions,
    translations: { id: questions.map((q) => makeTranslation(q.id)) },
    sets: SECTIONS.map((section) => ({
      id: `${section}-01`,
      section,
      questionIds: idsOf(section),
    })),
    exams: [
      {
        id: 'mock-test',
        durationSec: 600,
        sections: SECTIONS.map((section) => ({ section, questionIds: idsOf(section) })),
      },
    ],
  };
}

export function examOf(bundle: ContentBundle): ExamBlueprint {
  return bundle.exams[0]!;
}

export function questionMap(bundle: ContentBundle): Map<string, Question> {
  return new Map(bundle.questions.map((q) => [q.id, q]));
}

/** 深いコピー(検証テストでデータを書き換えるため) */
export const clone = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;
