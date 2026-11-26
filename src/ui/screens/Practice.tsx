import { useState } from 'preact/hooks';
import { getSet, getTranslation, questionsById } from '../../content';
import { getLocale, t } from '../../i18n';
import { assetUrl, storage } from '../../services';
import { AudioPlayer } from '../components/AudioPlayer';
import { Explanation } from '../components/Explanation';
import { Layout } from '../components/Layout';
import { QuestionView } from '../components/QuestionView';
import { NotFound } from './NotFound';

/** 練習モード(BR-P2〜BR-P6) */
export function Practice({ setId }: { setId: string }) {
  const set = getSet(setId);
  const [index, setIndex] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [correct, setCorrect] = useState(0);
  const [done, setDone] = useState(false);

  if (!set) return <NotFound />;

  const total = set.questionIds.length;

  if (done) {
    const retry = () => {
      setIndex(0);
      setSelected(null);
      setCorrect(0);
      setDone(false);
    };
    return (
      <Layout title={t('practice.resultTitle')} back="/practice">
        <section class="card center" data-testid="practice-result">
          <p class="score-big" data-testid="practice-result-score">
            {t('practice.resultScore', { correct, total })}
          </p>
        </section>
        <div class="stack">
          <button
            type="button"
            class="btn btn-primary"
            data-testid="practice-retry-button"
            onClick={retry}
          >
            {t('practice.retry')}
          </button>
          <a class="btn" href="#/practice" data-testid="practice-back-link">
            {t('practice.backToSections')}
          </a>
        </div>
      </Layout>
    );
  }

  const questionId = set.questionIds[index]!;
  const question = questionsById.get(questionId);
  if (!question) return <NotFound />;
  const translation = getTranslation(getLocale(), questionId);
  const answered = selected !== null;
  const isLast = index + 1 >= total;

  const choose = (choice: number) => {
    if (answered) return; // BR-P3: 解答後は選び直せない
    setSelected(choice);
    if (choice === question.answerIndex) setCorrect((n) => n + 1);
  };

  const next = () => {
    if (isLast) {
      // BR-P6: 最後まで解いたときだけ保存する
      storage.saveProgress({
        setId: set.id,
        answered: total,
        correct,
        completedAt: new Date().toISOString(),
      });
      setDone(true);
      return;
    }
    setIndex(index + 1);
    setSelected(null);
  };

  return (
    <Layout title={t(`section.${set.section}`)} back="/practice">
      <p class="progress" data-testid="practice-progress">
        {t('practice.progress', { current: index + 1, total })}
      </p>
      <QuestionView
        key={questionId}
        question={question}
        instruction={translation?.instruction}
        selected={selected}
        onSelect={choose}
        reveal={answered}
      >
        {question.audio && (
          <AudioPlayer key={questionId} src={assetUrl(question.audio)} mode="practice" plays={0} />
        )}
      </QuestionView>

      {answered && (
        <>
          <p
            class={`feedback ${selected === question.answerIndex ? 'is-correct' : 'is-wrong'}`}
            data-testid="practice-feedback"
          >
            {selected === question.answerIndex ? t('practice.correct') : t('practice.incorrect')}
          </p>
          <Explanation question={question} translation={translation} />
          <div class="stack">
            <button
              type="button"
              class="btn btn-primary"
              data-testid="practice-next-button"
              onClick={next}
            >
              {isLast ? t('practice.finish') : t('practice.next')}
            </button>
          </div>
        </>
      )}
    </Layout>
  );
}
