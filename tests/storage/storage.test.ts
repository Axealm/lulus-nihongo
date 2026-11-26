import { describe, expect, it, vi } from 'vitest';
import {
  AppStorage,
  MAX_RESULTS,
  STORAGE_VERSION,
  memoryStore,
  type KeyValueStore,
} from '../../src/storage/storage';
import type { ExamAttempt, ExamResult } from '../../src/domain/types';

const attempt: ExamAttempt = {
  examId: 'mock-test',
  startedAt: '2026-01-01T00:00:00Z',
  remainingSec: 123.5,
  sectionIndex: 1,
  questionIndex: 2,
  answers: { 'voc-0001': 0 },
  audioPlays: { 'lis-0001': 1 },
};

const result = (n: number): ExamResult => ({
  examId: 'mock-test',
  finishedAt: `2026-01-01T00:00:${String(n).padStart(2, '0')}Z`,
  sectionScores: [{ section: 'vocabulary', correct: 1, total: 2 }],
  estimatedScore: 100 + n,
  band: 'none',
  answers: {},
});

describe('AppStorage', () => {
  it('何も保存していないときは初期状態を返す', () => {
    const storage = new AppStorage(memoryStore());
    expect(storage.loadAttempt()).toBeNull();
    expect(storage.loadResults()).toEqual([]);
    expect(storage.loadProgress()).toEqual({});
    expect(storage.loadSettings()).toEqual({ locale: 'id' });
  });

  it('受験中の記録を保存し、読み込み、削除できる', () => {
    const storage = new AppStorage(memoryStore());
    storage.saveAttempt(attempt);
    expect(storage.loadAttempt()).toEqual(attempt);
    storage.clearAttempt();
    expect(storage.loadAttempt()).toBeNull();
  });

  it('結果は新しい順に並び、直近 20 件だけ残る (BR-E13)', () => {
    const storage = new AppStorage(memoryStore());
    for (let n = 1; n <= MAX_RESULTS + 5; n += 1) storage.addResult(result(n));
    const results = storage.loadResults();
    expect(results).toHaveLength(MAX_RESULTS);
    expect(results[0]!.estimatedScore).toBe(100 + MAX_RESULTS + 5);
    expect(results.at(-1)!.estimatedScore).toBe(100 + 6);
  });

  it('練習の進み具合をセットごとに保存する', () => {
    const storage = new AppStorage(memoryStore());
    storage.saveProgress({ setId: 'vocabulary-01', answered: 5, correct: 3 });
    storage.saveProgress({ setId: 'reading-01', answered: 5, correct: 5 });
    storage.saveProgress({ setId: 'vocabulary-01', answered: 5, correct: 4 });
    expect(storage.loadProgress()).toEqual({
      'vocabulary-01': { setId: 'vocabulary-01', answered: 5, correct: 4 },
      'reading-01': { setId: 'reading-01', answered: 5, correct: 5 },
    });
  });

  it('壊れたデータは破棄して初期状態に戻す (BR-O5)', () => {
    const kv = memoryStore();
    kv.setItem('jftprep.attempt', '{ これは JSON ではない');
    kv.setItem('jftprep.results', JSON.stringify({ v: STORAGE_VERSION, data: [{ examId: 1 }] }));
    const storage = new AppStorage(kv);
    expect(storage.loadAttempt()).toBeNull();
    expect(storage.loadResults()).toEqual([]);
    expect(kv.getItem('jftprep.attempt')).toBeNull();
    expect(kv.getItem('jftprep.results')).toBeNull();
  });

  it('バージョンが違うデータは破棄する (BR-O5)', () => {
    const kv = memoryStore();
    kv.setItem('jftprep.attempt', JSON.stringify({ v: STORAGE_VERSION + 1, data: attempt }));
    expect(new AppStorage(kv).loadAttempt()).toBeNull();
  });

  it('保存に失敗しても止まらず、通知は 1 度だけ (BR-O4)', () => {
    const failing: KeyValueStore = {
      getItem: () => null,
      setItem: () => {
        throw new Error('QuotaExceededError');
      },
      removeItem: () => undefined,
    };
    const onFail = vi.fn();
    const storage = new AppStorage(failing, onFail);
    expect(() => storage.saveAttempt(attempt)).not.toThrow();
    expect(() => storage.addResult(result(1))).not.toThrow();
    expect(onFail).toHaveBeenCalledTimes(1);
  });

  it('読み込みで例外が出ても初期状態を返す', () => {
    const throwing: KeyValueStore = {
      getItem: () => {
        throw new Error('SecurityError');
      },
      setItem: () => undefined,
      removeItem: () => undefined,
    };
    expect(new AppStorage(throwing).loadResults()).toEqual([]);
  });
});
