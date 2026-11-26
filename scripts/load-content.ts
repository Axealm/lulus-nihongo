// content/ 以下の JSON をディスクから読み込む(検証スクリプトと自動テストで使う)
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import type {
  ContentBundle,
  ExamBlueprint,
  PracticeSet,
  Question,
  QuestionTranslation,
  TranslationsByLocale,
} from '../src/domain/types';

const readJson = <T>(path: string): T => JSON.parse(readFileSync(path, 'utf8')) as T;

const jsonFilesIn = (dir: string): string[] =>
  readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => join(dir, name));

export function loadContentFromDisk(root: string): ContentBundle {
  const contentDir = join(root, 'content');

  const questions = jsonFilesIn(join(contentDir, 'questions')).flatMap((file) =>
    readJson<Question[]>(file),
  );

  const translations: TranslationsByLocale = {};
  const translationsDir = join(contentDir, 'translations');
  for (const locale of readdirSync(translationsDir).sort()) {
    const dir = join(translationsDir, locale);
    if (!statSync(dir).isDirectory()) continue;
    translations[locale] = jsonFilesIn(dir).flatMap((file) => readJson<QuestionTranslation[]>(file));
  }

  return {
    questions,
    translations,
    sets: readJson<PracticeSet[]>(join(contentDir, 'sets.json')),
    exams: readJson<ExamBlueprint[]>(join(contentDir, 'exams.json')),
  };
}

/** 画面の文言ファイルを、言語コード → 文言の対応として読み込む */
export function loadUiStringsFromDisk(root: string): Record<string, Record<string, string>> {
  const dir = join(root, 'content', 'ui');
  const result: Record<string, Record<string, string>> = {};
  for (const file of jsonFilesIn(dir)) {
    const locale = file.replace(/^.*[\\/]/, '').replace(/\.json$/, '');
    result[locale] = readJson<Record<string, string>>(file);
  }
  return result;
}

/** 音声や画像のパス(public/ からの相対パス)が実在するかを調べる関数を作る */
export const publicFileExists =
  (root: string) =>
  (path: string): boolean =>
    existsSync(join(root, 'public', path));
