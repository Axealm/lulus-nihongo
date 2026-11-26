// 同梱した問題データの読み込み。データの正しさはビルド時の検証(npm run validate)で保証する。
import type {
  ExamBlueprint,
  PracticeSet,
  Question,
  QuestionTranslation,
  Section,
} from '../domain/types';
import setsJson from '../../content/sets.json';
import examsJson from '../../content/exams.json';
import metaJson from '../../content/meta.json';

const questionFiles = import.meta.glob<Question[]>('../../content/questions/*.json', {
  eager: true,
  import: 'default',
});
const translationFiles = import.meta.glob<QuestionTranslation[]>(
  '../../content/translations/*/*.json',
  { eager: true, import: 'default' },
);

const FALLBACK_LOCALE = 'id';

export const questions: Question[] = Object.values(questionFiles).flat();
export const questionsById: ReadonlyMap<string, Question> = new Map(
  questions.map((q) => [q.id, q]),
);

const translationsByLocale = new Map<string, Map<string, QuestionTranslation>>();
for (const [path, list] of Object.entries(translationFiles)) {
  const locale = /translations\/([^/]+)\//.exec(path)?.[1];
  if (!locale) continue;
  const map = translationsByLocale.get(locale) ?? new Map<string, QuestionTranslation>();
  for (const item of list) map.set(item.id, item);
  translationsByLocale.set(locale, map);
}

export function getTranslation(locale: string, id: string): QuestionTranslation | undefined {
  return (
    translationsByLocale.get(locale)?.get(id) ?? translationsByLocale.get(FALLBACK_LOCALE)?.get(id)
  );
}

export const sets = setsJson as PracticeSet[];
export const exams = examsJson as ExamBlueprint[];
export const audioCredit: string = metaJson.audioCredit;

export const getSet = (id: string): PracticeSet | undefined => sets.find((s) => s.id === id);
export const getExam = (id: string): ExamBlueprint | undefined => exams.find((e) => e.id === id);
export const setsOf = (section: Section): PracticeSet[] =>
  sets.filter((s) => s.section === section);

export const examQuestionIds = (exam: ExamBlueprint): string[] =>
  exam.sections.flatMap((s) => s.questionIds);

/** 模擬試験で使う音声のパス(重複なし) */
export function examAudioPaths(exam: ExamBlueprint): string[] {
  const paths = examQuestionIds(exam)
    .map((id) => questionsById.get(id)?.audio)
    .filter((path): path is string => Boolean(path));
  return [...new Set(paths)];
}
