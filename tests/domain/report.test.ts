import { describe, expect, it } from 'vitest';
import { buildReportUrl } from '../../src/domain/report';

describe('buildReportUrl (BR-R2, BR-R3)', () => {
  const template = 'https://example.com/form?entry.1={id}&entry.2={version}';

  it('問題 ID とバージョンを埋め込む', () => {
    expect(buildReportUrl(template, 'lis-0003', '0.1.0')).toBe(
      'https://example.com/form?entry.1=lis-0003&entry.2=0.1.0',
    );
  });

  it('値を URL 用にエンコードする', () => {
    expect(buildReportUrl(template, 'a b&c', '1')).toBe(
      'https://example.com/form?entry.1=a%20b%26c&entry.2=1',
    );
  });

  it('未設定のときは null(ボタンを表示しない)', () => {
    expect(buildReportUrl(undefined, 'voc-0001', '1')).toBeNull();
    expect(buildReportUrl('', 'voc-0001', '1')).toBeNull();
    expect(buildReportUrl('   ', 'voc-0001', '1')).toBeNull();
  });

  it('https 以外の URL は使わない', () => {
    expect(buildReportUrl('javascript:alert(1)', 'voc-0001', '1')).toBeNull();
    expect(buildReportUrl('http://example.com/{id}', 'voc-0001', '1')).toBeNull();
  });
});
