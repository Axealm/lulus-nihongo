import { useEffect, useRef, useState } from 'preact/hooks';
import { getExam, getTranslation, questionsById } from '../../content';
import {
  advanceSection,
  goTo,
  isLastQuestion,
  isLastSection,
  isTimeUp,
  recordAudioPlay,
  setAnswer,
  tick,
  unansweredInSection,
} from '../../domain/exam';
import { gradeExam } from '../../domain/scoring';
import type { ExamAttempt } from '../../domain/types';
import { getLocale, t } from '../../i18n';
import { assetUrl, storage } from '../../services';
import { AudioPlayer } from '../components/AudioPlayer';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { QuestionNav } from '../components/QuestionNav';
import { QuestionView } from '../components/QuestionView';
import { Timer } from '../components/Timer';
import { navigate, setLeaveGuard } from '../router';

/** 残り時間を保存する間隔(BR-E11) */
const SAVE_INTERVAL_SEC = 5;
/** 1 回の更新で進める時間の上限。画面が裏に回っていた時間は数えない(中断として扱う) */
const MAX_TICK_SEC = 2;

/** 模擬試験の受験画面(BR-E2〜BR-E13) */
export function ExamRun({ examId }: { examId: string }) {
  const exam = getExam(examId);
  const path = `/exam/${examId}/run`;

  const [attempt, setAttempt] = useState<ExamAttempt | null>(() => {
    const saved = storage.loadAttempt();
    const usable = saved && exam && saved.examId === exam.id && exam.sections[saved.sectionIndex];
    return usable ? saved : null;
  });
  // タイマーとボタン操作の両方から最新の状態を参照するために持つ
  const attemptRef = useRef(attempt);
  const finishedRef = useRef(false);
  const [dialog, setDialog] = useState<'proceed' | 'leave' | null>(null);
  const [showInstruction, setShowInstruction] = useState(false);

  const apply = (next: ExamAttempt) => {
    attemptRef.current = next;
    setAttempt(next);
    storage.saveAttempt(next); // BR-E11: 解答や移動のたびに保存する
  };

  const finish = (final: ExamAttempt) => {
    if (!exam || finishedRef.current) return;
    finishedRef.current = true;
    // BR-E13: 結果を保存し、受験中の記録を消す
    storage.addResult(gradeExam(exam, questionsById, final.answers, new Date().toISOString()));
    storage.clearAttempt();
    navigate('/result/0', { force: true });
  };

  useEffect(() => {
    if (!exam || !attemptRef.current) {
      // 受験中の記録がなければ、説明画面に戻す
      navigate(exam ? `/exam/${examId}` : '/exam', { force: true });
      return;
    }

    setLeaveGuard({ path, onBlocked: () => setDialog('leave') });

    let last = Date.now();
    let sinceSave = 0;
    const timer = setInterval(() => {
      const current = attemptRef.current;
      if (!current || finishedRef.current) return;
      const now = Date.now();
      const elapsed = Math.min((now - last) / 1000, MAX_TICK_SEC);
      last = now;
      const next = tick(current, elapsed);
      attemptRef.current = next;
      setAttempt(next);
      if (isTimeUp(next)) {
        finish(next); // BR-E9
        return;
      }
      sinceSave += elapsed;
      if (sinceSave >= SAVE_INTERVAL_SEC) {
        sinceSave = 0;
        storage.saveAttempt(next);
      }
    }, 1000);

    const save = () => {
      if (!finishedRef.current && attemptRef.current) storage.saveAttempt(attemptRef.current);
    };
    document.addEventListener('visibilitychange', save);
    window.addEventListener('pagehide', save);

    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', save);
      window.removeEventListener('pagehide', save);
      setLeaveGuard(null);
      save();
    };
  }, []);

  if (!exam || !attempt) return null;

  const section = exam.sections[attempt.sectionIndex]!;
  const questionId = section.questionIds[attempt.questionIndex]!;
  const question = questionsById.get(questionId);
  if (!question) return null;

  const translation = getTranslation(getLocale(), questionId);
  const listening = section.section === 'listening';
  const lastQuestion = isLastQuestion(exam, attempt);
  const lastSection = isLastSection(exam, attempt);
  const total = section.questionIds.length;
  const unanswered = unansweredInSection(exam, attempt);
  const current = () => attemptRef.current ?? attempt;

  const move = (target: number) => apply(goTo(exam, current(), target));

  const proceed = () => {
    setDialog(null);
    const next = advanceSection(exam, current());
    if (next) apply(next);
    else finish(current());
  };

  const leave = () => {
    storage.saveAttempt(current());
    navigate('/', { force: true });
  };

  const proceedLabel = lastSection ? t('exam.finish') : t('exam.nextSection');
  const proceedMessage = [
    unanswered > 0 ? t('exam.unanswered', { n: unanswered }) : '',
    lastSection ? t('exam.finishConfirm') : t('exam.nextSectionConfirm'),
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div class="screen">
      <header class="topbar topbar-exam">
        <button
          type="button"
          class="topbar-back"
          data-testid="exam-leave-button"
          onClick={() => setDialog('leave')}
        >
          ✕ {t('exam.leave')}
        </button>
        <Timer remainingSec={attempt.remainingSec} />
      </header>

      <main class="content">
        <p class="progress">
          <strong data-testid="exam-section-name">{t(`section.${section.section}`)}</strong>
          <br />
          <span data-testid="exam-position">
            {t('exam.sectionOf', {
              current: attempt.sectionIndex + 1,
              total: exam.sections.length,
            })}
            {' · '}
            {t('exam.questionOf', { current: attempt.questionIndex + 1, total })}
          </span>
        </p>

        {/* BR-E8: 設問の現地語訳は、ボタンを押したときだけ表示する */}
        {translation && (
          <button
            type="button"
            class="btn btn-small"
            data-testid="exam-instruction-toggle"
            onClick={() => setShowInstruction(!showInstruction)}
          >
            {showInstruction ? t('question.hideInstruction') : t('question.showInstruction')}
          </button>
        )}

        <QuestionView
          key={questionId}
          question={question}
          instruction={showInstruction ? translation?.instruction : undefined}
          selected={attempt.answers[questionId] ?? null}
          onSelect={(choice) => apply(setAnswer(exam, current(), choice))}
          reveal={false}
        >
          {question.audio && (
            <AudioPlayer
              key={questionId}
              src={assetUrl(question.audio)}
              mode="exam"
              plays={attempt.audioPlays[questionId] ?? 0}
              onPlay={() => apply(recordAudioPlay(current(), questionId))}
            />
          )}
        </QuestionView>

        <div class="row row-nav">
          {/* BR-E5: 聴解では前の問題に戻れない */}
          {!listening && (
            <button
              type="button"
              class="btn"
              disabled={attempt.questionIndex === 0}
              data-testid="exam-prev-button"
              onClick={() => move(attempt.questionIndex - 1)}
            >
              ‹ {t('exam.prev')}
            </button>
          )}
          {!lastQuestion && (
            <button
              type="button"
              class="btn btn-primary"
              data-testid="exam-next-button"
              onClick={() => move(attempt.questionIndex + 1)}
            >
              {t('exam.next')} ›
            </button>
          )}
        </div>

        {/* BR-E4: 聴解以外は、セクション内を自由に行き来できる */}
        {!listening && (
          <QuestionNav
            count={total}
            current={attempt.questionIndex}
            answered={section.questionIds.map((id) => attempt.answers[id] !== undefined)}
            onGo={move}
          />
        )}

        {/* 聴解は最後の問題まで進んでから。ほかのセクションはいつでも次へ進める */}
        {(!listening || lastQuestion) && (
          <div class="stack">
            <button
              type="button"
              class={`btn${lastQuestion ? ' btn-primary' : ''}`}
              data-testid="exam-section-button"
              onClick={() => setDialog('proceed')}
            >
              {proceedLabel}
            </button>
          </div>
        )}
      </main>

      {dialog === 'proceed' && (
        <ConfirmDialog
          message={proceedMessage}
          confirmLabel={proceedLabel}
          cancelLabel={t('common.cancel')}
          onConfirm={proceed}
          onCancel={() => setDialog(null)}
        />
      )}
      {dialog === 'leave' && (
        <ConfirmDialog
          message={t('exam.leaveConfirm')}
          confirmLabel={t('exam.leave')}
          cancelLabel={t('exam.stay')}
          onConfirm={leave}
          onCancel={() => setDialog(null)}
        />
      )}
    </div>
  );
}
