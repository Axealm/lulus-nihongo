import { describe, expect, it } from 'vitest';
import { validateContent } from '../../src/domain/validate';
import { SECTIONS } from '../../src/domain/types';
import {
  loadContentFromDisk,
  loadUiStringsFromDisk,
  publicFileExists,
} from '../../scripts/load-content';

const root = process.cwd();

describe('同梱の問題データ', () => {
  const bundle = loadContentFromDisk(root);

  it('検証を通る (BR-D1〜BR-D9)', () => {
    expect(validateContent(bundle, publicFileExists(root))).toEqual([]);
  });

  it('すべてのセクションに練習セットがある', () => {
    for (const section of SECTIONS) {
      expect(bundle.sets.some((set) => set.section === section)).toBe(true);
    }
  });

  it('模擬試験が 1 つ以上ある', () => {
    expect(bundle.exams.length).toBeGreaterThan(0);
  });

  it('聴解の文字起こしは、音声生成スクリプトが読める形式になっている', () => {
    for (const q of bundle.questions.filter((item) => item.section === 'listening')) {
      for (const line of (q.transcript ?? '').split('\n')) {
        expect(line, q.id).toMatch(/^(おんな|おとこ)：.+$/);
      }
    }
  });
});

describe('画面の文言', () => {
  const dictionaries = loadUiStringsFromDisk(root);

  it('インドネシア語の文言がある', () => {
    expect(dictionaries.id).toBeDefined();
  });

  it('空の文言がない', () => {
    for (const [locale, dict] of Object.entries(dictionaries)) {
      for (const [key, value] of Object.entries(dict)) {
        expect(value.trim().length, `${locale}:${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('ほかの言語は、インドネシア語にないキーを持たない', () => {
    const baseKeys = new Set(Object.keys(dictionaries.id ?? {}));
    for (const [locale, dict] of Object.entries(dictionaries)) {
      const extra = Object.keys(dict).filter((key) => !baseKeys.has(key));
      expect(extra, locale).toEqual([]);
    }
  });
});
