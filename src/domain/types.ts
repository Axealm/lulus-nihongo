// ドメインの型定義。設計書: aidlc-docs/construction/app/functional-design/domain-entities.md

export const SECTIONS = ['vocabulary', 'conversation', 'listening', 'reading'] as const;
export type Section = (typeof SECTIONS)[number];

/** 問題 ID の接頭辞(BR-D1) */
export const SECTION_PREFIX: Record<Section, string> = {
  vocabulary: 'voc-',
  conversation: 'con-',
  listening: 'lis-',
  reading: 'rea-',
};

/** セクションごとの出題カテゴリ(BR-D5)。本番の出題カテゴリに対応する */
export const CATEGORIES: Record<Section, readonly string[]> = {
  // 語の意味、語の用法、漢字の読み、漢字の意味と用法
  vocabulary: ['word-meaning', 'word-usage', 'kanji-reading', 'kanji-meaning'],
  // 文法、表現
  conversation: ['grammar', 'expression'],
  // 社交的なやりとり、店や公共機関でのやりとり、指示・アナウンス
  listening: ['social', 'public', 'announcement'],
  // 短い文章の内容理解、情報検索
  reading: ['comprehension', 'information-search'],
};

export const LEVELS = ['A1', 'A2'] as const;
export type Level = (typeof LEVELS)[number];

export interface Question {
  id: string;
  section: Section;
  category: string;
  level: Level;
  /** 日本語の問題文。`__下線__` で下線を引ける */
  prompt: string;
  /** 読解の本文、掲示など */
  passage?: string;
  image?: string;
  /** 聴解は必須(BR-D4) */
  audio?: string;
  /** 聴解は必須(BR-D4)。解説画面でのみ表示する */
  transcript?: string;
  choices: string[];
  answerIndex: number;
}

export interface QuestionTranslation {
  id: string;
  /** 設問の現地語訳 */
  instruction: string;
  /** 正解の理由の解説 */
  explanation: string;
  transcriptTranslation?: string;
}

export interface PracticeSet {
  id: string;
  section: Section;
  questionIds: string[];
}

export interface ExamSection {
  section: Section;
  questionIds: string[];
}

export interface ExamBlueprint {
  id: string;
  durationSec: number;
  sections: ExamSection[];
}

/** 問題 ID → 選んだ選択肢の位置 */
export type Answers = Record<string, number>;

export interface ExamAttempt {
  examId: string;
  startedAt: string;
  remainingSec: number;
  sectionIndex: number;
  questionIndex: number;
  answers: Answers;
  /** 問題 ID → 聴解音声の再生回数 */
  audioPlays: Record<string, number>;
}

export type Band = 'A2' | 'A2.1' | 'A1' | 'none';

export interface SectionScore {
  section: Section;
  correct: number;
  total: number;
}

export interface ExamResult {
  examId: string;
  finishedAt: string;
  sectionScores: SectionScore[];
  estimatedScore: number;
  band: Band;
  answers: Answers;
}

export interface PracticeProgress {
  setId: string;
  answered: number;
  correct: number;
  completedAt?: string;
}

export interface Settings {
  locale: string;
}

/** 言語コード → その言語の QuestionTranslation 一覧 */
export type TranslationsByLocale = Record<string, QuestionTranslation[]>;

export interface ContentBundle {
  questions: Question[];
  translations: TranslationsByLocale;
  sets: PracticeSet[];
  exams: ExamBlueprint[];
}
