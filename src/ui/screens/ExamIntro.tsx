import { useState } from 'preact/hooks';
import { examAudioPaths, examQuestionIds, exams, getExam } from '../../content';
import { createAttempt } from '../../domain/exam';
import type { ExamBlueprint } from '../../domain/types';
import { t } from '../../i18n';
import { assetUrl, prefetchAll, storage } from '../../services';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { Layout } from '../components/Layout';
import { navigate } from '../router';
import { NotFound } from './NotFound';

const infoOf = (exam: ExamBlueprint) => ({
  count: examQuestionIds(exam).length,
  minutes: Math.round(exam.durationSec / 60),
});

/** 模擬試験を選ぶ画面 */
export function ExamList() {
  return (
    <Layout title={t('exam.listTitle')} back="/">
      {exams.map((exam, i) => (
        <a
          class="card card-link card-row"
          key={exam.id}
          href={`#/exam/${exam.id}`}
          data-testid={`exam-link-${exam.id}`}
        >
          <strong>{t('exam.name', { n: i + 1 })}</strong>
          <span class="muted">{t('exam.info', infoOf(exam))}</span>
        </a>
      ))}
    </Layout>
  );
}

/** 模擬試験の説明画面(BR-E1) */
export function ExamIntro({ examId }: { examId: string }) {
  const exam = getExam(examId);
  const [status, setStatus] = useState<'idle' | 'preparing' | 'failed'>('idle');
  const [confirmRestart, setConfirmRestart] = useState(false);

  if (!exam) return <NotFound />;

  const existing = storage.loadAttempt();
  const canResume = existing?.examId === exam.id;

  const begin = async () => {
    setConfirmRestart(false);
    setStatus('preparing');
    // BR-O3: 試験で使う音声をまとめて取得する。失敗したら開始しない
    const ok = await prefetchAll(examAudioPaths(exam).map(assetUrl));
    if (!ok) {
      setStatus('failed');
      return;
    }
    storage.saveAttempt(createAttempt(exam, new Date().toISOString()));
    navigate(`/exam/${exam.id}/run`);
  };

  const start = () => {
    if (existing) setConfirmRestart(true);
    else void begin();
  };

  return (
    <Layout title={t('exam.introTitle')} back="/exam">
      <section class="card">
        <ul class="rules">
          <li>{t('exam.rule.time', infoOf(exam))}</li>
          <li>{t('exam.rule.order')}</li>
          <li>{t('exam.rule.section')}</li>
          <li>{t('exam.rule.listening')}</li>
          <li>{t('exam.rule.pause')}</li>
          <li>{t('exam.rule.estimate')}</li>
        </ul>
        <p class="muted" data-testid="exam-disclaimer">
          {t('exam.disclaimer')}
        </p>
      </section>

      {status === 'failed' && (
        <p class="error" data-testid="exam-audio-failed">
          {t('exam.audioFailed')}
        </p>
      )}

      <div class="stack">
        {canResume && (
          <a class="btn btn-primary" href={`#/exam/${exam.id}/run`} data-testid="exam-resume-link">
            {t('home.resume')}
          </a>
        )}
        <button
          type="button"
          class={`btn${canResume ? '' : ' btn-primary'}`}
          disabled={status === 'preparing'}
          data-testid="exam-start-button"
          onClick={start}
        >
          {status === 'preparing'
            ? t('exam.preparing')
            : canResume
              ? t('exam.restart')
              : t('exam.start')}
        </button>
      </div>

      {confirmRestart && (
        <ConfirmDialog
          message={t('exam.restartConfirm')}
          confirmLabel={t('exam.restart')}
          cancelLabel={t('common.cancel')}
          onConfirm={() => void begin()}
          onCancel={() => setConfirmRestart(false)}
        />
      )}
    </Layout>
  );
}
