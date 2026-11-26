import type { ExamAttempt, ExamResult, PracticeProgress, Settings } from '../domain/types';

/** localStorage と同じ形の、最小限のキー・バリュー保存 */
export interface KeyValueStore {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** BR-O5: 保存データのバージョン。形式を変えたら上げる(古いデータは破棄される) */
export const STORAGE_VERSION = 1;
/** BR-E13 */
export const MAX_RESULTS = 20;

const PREFIX = 'jftprep.';
const DEFAULT_SETTINGS: Settings = { locale: 'id' };

export function memoryStore(): KeyValueStore {
  const map = new Map<string, string>();
  return {
    getItem: (key) => map.get(key) ?? null,
    setItem: (key, value) => void map.set(key, value),
    removeItem: (key) => void map.delete(key),
  };
}

/**
 * ブラウザの保存領域を返す。使えない場合(プライベートモードなど)はメモリ上の保存に切り替える。
 */
export function browserStore(): { store: KeyValueStore; persistent: boolean } {
  try {
    const ls = globalThis.localStorage;
    const probe = `${PREFIX}probe`;
    ls.setItem(probe, '1');
    ls.removeItem(probe);
    return { store: ls, persistent: true };
  } catch {
    return { store: memoryStore(), persistent: false };
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumberMap = (value: unknown): value is Record<string, number> =>
  isRecord(value) && Object.values(value).every((v) => typeof v === 'number');

function isAttempt(value: unknown): value is ExamAttempt {
  return (
    isRecord(value) &&
    typeof value.examId === 'string' &&
    typeof value.startedAt === 'string' &&
    typeof value.remainingSec === 'number' &&
    Number.isInteger(value.sectionIndex) &&
    Number.isInteger(value.questionIndex) &&
    isNumberMap(value.answers) &&
    isNumberMap(value.audioPlays)
  );
}

function isResult(value: unknown): value is ExamResult {
  return (
    isRecord(value) &&
    typeof value.examId === 'string' &&
    typeof value.finishedAt === 'string' &&
    typeof value.estimatedScore === 'number' &&
    typeof value.band === 'string' &&
    Array.isArray(value.sectionScores) &&
    value.sectionScores.every(
      (s) =>
        isRecord(s) &&
        typeof s.section === 'string' &&
        typeof s.correct === 'number' &&
        typeof s.total === 'number',
    ) &&
    isNumberMap(value.answers)
  );
}

const isResults = (value: unknown): value is ExamResult[] =>
  Array.isArray(value) && value.every(isResult);

function isProgressMap(value: unknown): value is Record<string, PracticeProgress> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (p) =>
        isRecord(p) &&
        typeof p.setId === 'string' &&
        typeof p.answered === 'number' &&
        typeof p.correct === 'number',
    )
  );
}

const isSettings = (value: unknown): value is Settings =>
  isRecord(value) && typeof value.locale === 'string';

export class AppStorage {
  private writeFailed = false;

  /**
   * @param onWriteFail 保存に初めて失敗したときに 1 度だけ呼ばれる(BR-O4)
   */
  constructor(
    private readonly kv: KeyValueStore,
    private readonly onWriteFail?: () => void,
  ) {}

  /** 読み込めないデータは破棄して fallback を返す(BR-O5) */
  private read<T>(key: string, guard: (value: unknown) => value is T, fallback: T): T {
    let raw: string | null;
    try {
      raw = this.kv.getItem(PREFIX + key);
    } catch {
      return fallback;
    }
    if (raw === null) return fallback;
    try {
      const envelope: unknown = JSON.parse(raw);
      if (isRecord(envelope) && envelope.v === STORAGE_VERSION && guard(envelope.data)) {
        return envelope.data;
      }
    } catch {
      // 壊れたデータ。下で破棄する
    }
    this.remove(key);
    return fallback;
  }

  /** 保存に失敗してもアプリは止めない(BR-O4) */
  private write(key: string, data: unknown): void {
    try {
      this.kv.setItem(PREFIX + key, JSON.stringify({ v: STORAGE_VERSION, data }));
    } catch {
      if (!this.writeFailed) {
        this.writeFailed = true;
        this.onWriteFail?.();
      }
    }
  }

  private remove(key: string): void {
    try {
      this.kv.removeItem(PREFIX + key);
    } catch {
      // 削除できなくても続行する
    }
  }

  loadAttempt(): ExamAttempt | null {
    return this.read<ExamAttempt | null>(
      'attempt',
      (v): v is ExamAttempt | null => isAttempt(v),
      null,
    );
  }

  saveAttempt(attempt: ExamAttempt): void {
    this.write('attempt', attempt);
  }

  clearAttempt(): void {
    this.remove('attempt');
  }

  /** 新しい順 */
  loadResults(): ExamResult[] {
    return this.read('results', isResults, []);
  }

  /** 先頭に追加し、直近 MAX_RESULTS 件だけ残す(BR-E13) */
  addResult(result: ExamResult): void {
    this.write('results', [result, ...this.loadResults()].slice(0, MAX_RESULTS));
  }

  loadProgress(): Record<string, PracticeProgress> {
    return this.read('progress', isProgressMap, {});
  }

  saveProgress(progress: PracticeProgress): void {
    this.write('progress', { ...this.loadProgress(), [progress.setId]: progress });
  }

  loadSettings(): Settings {
    return this.read('settings', isSettings, DEFAULT_SETTINGS);
  }

  saveSettings(settings: Settings): void {
    this.write('settings', settings);
  }
}
