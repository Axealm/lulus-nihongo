import type { Question, QuestionTranslation } from '../../domain/types';
import { buildReportUrl } from '../../domain/report';
import { t } from '../../i18n';
import { APP_VERSION, REPORT_FORM_URL } from '../../services';

interface Props {
  question: Question;
  translation?: QuestionTranslation;
  /** 渡すと「あなたの解答」も表示する。undefined は未解答 */
  yourAnswer?: { index: number | undefined };
}

/** 正解、現地語の解説、文字起こし、誤り報告ボタン(BR-P3、BR-P4、BR-R1) */
export function Explanation({ question, translation, yourAnswer }: Props) {
  const reportUrl = buildReportUrl(REPORT_FORM_URL, question.id, APP_VERSION);
  return (
    <section class="explanation" data-testid="explanation">
      <h2>{t('explain.title')}</h2>
      {yourAnswer && (
        <p>
          <span class="label">{t('explain.yourAnswer')}</span>
          {yourAnswer.index === undefined ? (
            <span>{t('explain.noAnswer')}</span>
          ) : (
            <span class="ja" lang="ja">
              {question.choices[yourAnswer.index]}
            </span>
          )}
        </p>
      )}
      <p>
        <span class="label">{t('explain.answer')}</span>
        <span class="ja" lang="ja" data-testid="explanation-answer">
          {question.choices[question.answerIndex]}
        </span>
      </p>
      {translation && <p data-testid="explanation-text">{translation.explanation}</p>}
      {question.transcript && (
        <>
          <h3>{t('explain.transcript')}</h3>
          <p class="transcript ja" lang="ja">
            {question.transcript}
          </p>
          {translation?.transcriptTranslation && (
            <>
              <h3>{t('explain.transcriptTranslation')}</h3>
              <p class="transcript">{translation.transcriptTranslation}</p>
            </>
          )}
        </>
      )}
      {reportUrl && (
        <a
          class="report-link"
          href={reportUrl}
          target="_blank"
          rel="noopener noreferrer"
          data-testid="explanation-report-link"
        >
          {t('explain.report')}
        </a>
      )}
    </section>
  );
}
