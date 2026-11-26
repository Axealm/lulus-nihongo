import { useState } from 'preact/hooks';
import { examQuestionIds, getExam, getTranslation, questionsById } from '../../content';
import { percent } from '../../domain/scoring';
import { getLocale, t, type MessageKey } from '../../i18n';
import { assetUrl, storage } from '../../services';
import { AudioPlayer } from '../components/AudioPlayer';
import { Explanation } from '../components/Explanation';
import { Layout } from '../components/Layout';
import { QuestionNav } from '../components/QuestionNav';
import { QuestionView } from '../components/QuestionView';

function ResultNotFound() {
  return (
    <Layout title={t('result.title')} back="/">
      <p data-testid="result-not-found">{t('result.notFound')}</p>
      <a class="btn" href="#/">
        {t('common.home')}
      </a>
    </Layout>
  );
}

/** 模擬試験の結果画面(BR-S3、BR-S4)。index は新しい順の位置(0 が最新) */
export function ExamResultScreen({ index }: { index: number }) {
  const result = storage.loadResults()[index];
  if (!result) return <ResultNotFound />;

  return (
    <Layout title={t('result.title')} back="/">
      <section class="card center">
        <p class="muted">{t('result.score')}</p>
        <p class="score-big">
          <span data-testid="result-score">{result.estimatedScore}</span>
          <small> {t('result.scoreMax')}</small>
        </p>
        <p class={`band band-${result.band === 'none' ? 'none' : 'ok'}`} data-testid="result-band">
          {t(`result.band.${result.band}` as MessageKey)}
        </p>
        <p class="notice" data-testid="result-notice">
          {t('result.notice')}
        </p>
      </section>

      <section class="card">
        <h2>{t('result.bySection')}</h2>
        <ul class="section-scores">
          {result.sectionScores.map((s) => (
            <li key={s.section} data-testid={`result-section-${s.section}`}>
              <span>{t(`section.${s.section}`)}</span>
              <span class="bar">
                <span class="bar-fill" style={{ width: `${percent(s.correct, s.total)}%` }} />
              </span>
              <span class="muted">
                {t('result.correctOf', {
                  correct: s.correct,
                  total: s.total,
                  percent: percent(s.correct, s.total),
                })}
              </span>
            </li>
          ))}
        </ul>
      </section>

      <div class="stack">
        {getExam(result.examId) && (
          <a
            class="btn btn-primary"
            href={`#/result/${index}/review`}
            data-testid="result-review-link"
          >
            {t('result.review')}
          </a>
        )}
        <a class="btn" href="#/" data-testid="result-home-link">
          {t('common.home')}
        </a>
      </div>
    </Layout>
  );
}

/** 振り返り画面(BR-S5)。問題ごとに、自分の解答、正解、解説を表示する */
export function Review({ index }: { index: number }) {
  const result = storage.loadResults()[index];
  const exam = result ? getExam(result.examId) : undefined;
  const [position, setPosition] = useState(0);

  if (!result || !exam) return <ResultNotFound />;

  const ids = examQuestionIds(exam);
  const questionId = ids[position]!;
  const question = questionsById.get(questionId);
  if (!question) return <ResultNotFound />;

  const translation = getTranslation(getLocale(), questionId);
  const marks = ids.map((id) =>
    result.answers[id] === questionsById.get(id)?.answerIndex ? 'correct' : 'wrong',
  );

  return (
    <Layout title={t('review.title')} back={`/result/${index}`}>
      <QuestionNav count={ids.length} current={position} marks={marks} onGo={setPosition} />
      <p class="progress">
        <strong>{t(`section.${question.section}`)}</strong>
        <br />
        {t('exam.questionOf', { current: position + 1, total: ids.length })}
      </p>
      <QuestionView
        key={questionId}
        question={question}
        instruction={translation?.instruction}
        selected={result.answers[questionId] ?? null}
        reveal
      >
        {question.audio && (
          <AudioPlayer key={questionId} src={assetUrl(question.audio)} mode="review" plays={0} />
        )}
      </QuestionView>
      <Explanation
        question={question}
        translation={translation}
        yourAnswer={{ index: result.answers[questionId] }}
      />
      <div class="row row-nav">
        <button
          type="button"
          class="btn"
          disabled={position === 0}
          data-testid="review-prev-button"
          onClick={() => setPosition(position - 1)}
        >
          ‹ {t('exam.prev')}
        </button>
        <button
          type="button"
          class="btn btn-primary"
          disabled={position >= ids.length - 1}
          data-testid="review-next-button"
          onClick={() => setPosition(position + 1)}
        >
          {t('exam.next')} ›
        </button>
      </div>
    </Layout>
  );
}
