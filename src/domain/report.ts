/**
 * 誤り報告フォームの URL を組み立てる(BR-R2)。
 * formUrl の中の {id} と {version} を置き換える。
 * formUrl が未設定のときは null を返し、ボタンを表示しない(BR-R3)。
 */
export function buildReportUrl(
  formUrl: string | undefined | null,
  questionId: string,
  version: string,
): string | null {
  const template = formUrl?.trim();
  if (!template) return null;
  if (!/^https:\/\//i.test(template)) return null;
  return template
    .replaceAll('{id}', encodeURIComponent(questionId))
    .replaceAll('{version}', encodeURIComponent(version));
}
