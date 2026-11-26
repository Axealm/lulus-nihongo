import { t } from '../../i18n';

/** 残り時間を 分:秒 で表す */
export function formatTime(remainingSec: number): string {
  const total = Math.max(0, Math.ceil(remainingSec));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${String(seconds).padStart(2, '0')}`;
}

/** 残り 5 分で色を変える */
export function Timer({ remainingSec }: { remainingSec: number }) {
  return (
    <span
      class={`timer${remainingSec <= 300 ? ' is-warning' : ''}`}
      aria-label={t('exam.timeLeft')}
      data-testid="exam-timer"
    >
      ⏱ {formatTime(remainingSec)}
    </span>
  );
}
