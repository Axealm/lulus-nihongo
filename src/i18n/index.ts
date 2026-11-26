// 画面の文言(BR-L1〜BR-L3)。文言は content/ui/<言語コード>.json に置く。
import idDict from '../../content/ui/id.json';

/** 文言のキー。id.json にないキーを使うとコンパイルエラーになる */
export type MessageKey = keyof typeof idDict;

const dictFiles = import.meta.glob<Record<string, string>>('../../content/ui/*.json', {
  eager: true,
  import: 'default',
});

const dictionaries: Record<string, Record<string, string>> = {};
for (const [path, dict] of Object.entries(dictFiles)) {
  const locale = /([^/]+)\.json$/.exec(path)?.[1];
  if (locale) dictionaries[locale] = dict;
}

let currentLocale = 'id';

export function setLocale(locale: string): void {
  if (dictionaries[locale]) currentLocale = locale;
}

export const getLocale = (): string => currentLocale;

/**
 * 文言を返す。選んだ言語にない文言は、インドネシア語の文言で補う(BR-L3)。
 * {name} の形の部分は vars の値に置き換える。
 */
export function t(key: MessageKey, vars?: Record<string, string | number>): string {
  const template = dictionaries[currentLocale]?.[key] ?? idDict[key];
  if (!vars) return template;
  return template.replace(/\{(\w+)\}/g, (whole, name: string) =>
    name in vars ? String(vars[name]) : whole,
  );
}
