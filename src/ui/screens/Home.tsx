import { useState } from 'preact/hooks';
import { getExam } from '../../content';
import { t, type MessageKey } from '../../i18n';
import { storage } from '../../services';
import { ConfirmDialog } from '../components/ConfirmDialog';

export function Home() {
  const [attempt, setAttempt] = useState(() => {
    const saved = storage.loadAttempt();
    if (saved && !getExam(saved.examId)) {
      // 問題データの更新で、受けていた模擬試験がなくなった場合
      storage.clearAttempt();
      return null;
    }
    return saved;
  });
  const [confirming, setConfirming] = useState(false);
  const latest = storage.loadResults()[0];

  const discard = () => {
    storage.clearAttempt();
    setAttempt(null);
    setConfirming(false);
  };

  return (
    <div class="screen">
      <header class="hero">
        <h1>{t('app.name')}</h1>
        <p>{t('app.tagline')}</p>
      </header>
      <main class="content">
        {attempt && (
          <section class="card card-notice" data-testid="home-resume">
            <h2>{t('home.resumeTitle')}</h2>
            <div class="row">
              <a
                class="btn btn-primary"
                href={`#/exam/${attempt.examId}/run`}
                data-testid="home-resume-link"
              >
                {t('home.resume')}
              </a>
              <button
                type="button"
                class="btn"
                data-testid="home-discard-button"
                onClick={() => setConfirming(true)}
              >
                {t('home.discard')}
              </button>
            </div>
          </section>
        )}

        <a class="card card-link" href="#/practice" data-testid="home-practice-link">
          <h2>{t('home.practice')}</h2>
          <p>{t('home.practiceDesc')}</p>
        </a>
        <a class="card card-link" href="#/exam" data-testid="home-exam-link">
          <h2>{t('home.exam')}</h2>
          <p>{t('home.examDesc')}</p>
        </a>

        {latest && (
          <a class="card card-link" href="#/result/0" data-testid="home-result-link">
            <h2>{t('home.lastResult')}</h2>
            <p>
              <strong class="score-inline">{latest.estimatedScore}</strong> {t('result.scoreMax')}
              {' · '}
              {t(`result.band.${latest.band}` as MessageKey)}
            </p>
          </a>
        )}

        {/* 記事のページはアプリの外(/panduan/)にある。ふつうのリンクで移動する */}
        <a class="card card-link" href="./panduan/" data-testid="home-guide-link">
          <h2>{t('home.guide')}</h2>
          <p>{t('home.guideDesc')}</p>
        </a>

        <p class="footer-link">
          <a href="#/about" data-testid="home-about-link">
            {t('home.about')}
          </a>
        </p>
      </main>

      {confirming && (
        <ConfirmDialog
          message={t('home.discardConfirm')}
          confirmLabel={t('home.discard')}
          cancelLabel={t('common.cancel')}
          onConfirm={discard}
          onCancel={() => setConfirming(false)}
        />
      )}
    </div>
  );
}
