// アプリ全体で 1 つだけ持つもの(端末内保存、設定値)
import { AppStorage, browserStore } from './storage/storage';

const { store, persistent } = browserStore();
let storageUnavailable = !persistent;
const listeners = new Set<() => void>();

export const storage = new AppStorage(store, () => {
  storageUnavailable = true;
  listeners.forEach((listener) => listener());
});

/** BR-O4: 記録が残らない状態かどうか */
export const isStorageUnavailable = (): boolean => storageUnavailable;

export function onStorageUnavailable(listener: () => void): () => void {
  listeners.add(listener);
  return () => void listeners.delete(listener);
}

export const APP_VERSION: string = __APP_VERSION__;
export const REPORT_FORM_URL: string | undefined = import.meta.env.VITE_REPORT_FORM_URL;

/** 学校・企業向けの問い合わせフォームの URL。https でなければ未設定として扱い、リンクを出さない */
const contactFormUrl = import.meta.env.VITE_CONTACT_FORM_URL?.trim();
export const CONTACT_FORM_URL: string | undefined =
  contactFormUrl && /^https:\/\//i.test(contactFormUrl) ? contactFormUrl : undefined;

/** public/ 以下のファイルの URL を作る */
export const assetUrl = (path: string): string => `${import.meta.env.BASE_URL}${path}`;

/**
 * BR-O3: ファイルをまとめて取得する。Service Worker が有効なら、取得したものは端末に保存される。
 * 1 つでも取得できなければ false を返す。
 */
export async function prefetchAll(urls: string[]): Promise<boolean> {
  try {
    const responses = await Promise.all(urls.map((url) => fetch(url)));
    if (!responses.every((res) => res.ok)) return false;
    await Promise.all(responses.map((res) => res.blob()));
    return true;
  } catch {
    return false;
  }
}
