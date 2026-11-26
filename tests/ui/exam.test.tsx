// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { examQuestionIds, exams, questionsById } from '../../src/content';
import { createAttempt } from '../../src/domain/exam';
import { estimateScore } from '../../src/domain/scoring';
import { storage } from '../../src/services';
import { setLeaveGuard } from '../../src/ui/router';
import { ExamResultScreen, Review } from '../../src/ui/screens/ExamResult';
import { ExamRun } from '../../src/ui/screens/ExamRun';

// 同梱の最初の模擬試験を使う(問題数が変わっても通るように、数は決め打ちしない)
const exam = exams[0]!;
const EXAM_ID = exam.id;
const LISTENING = exam.sections.findIndex((s) => s.section === 'listening');

const startAttempt = (overrides = {}) =>
  storage.saveAttempt({ ...createAttempt(exam, '2026-01-01T00:00:00Z'), ...overrides });

beforeEach(() => {
  localStorage.clear();
  window.location.hash = '';
});
afterEach(() => {
  cleanup();
  setLeaveGuard(null);
});

describe('模擬試験', () => {
  it('すべて 1 番を選んで最後まで進めると、採点されて結果画面へ移る', () => {
    startAttempt();
    render(<ExamRun examId={EXAM_ID} />);

    exam.sections.forEach((section, sectionIndex) => {
      section.questionIds.forEach((_, questionIndex) => {
        // BR-E8: 試験中は正誤と解説を表示しない
        expect(screen.queryByTestId('explanation')).toBeNull();
        expect(screen.queryByTestId('practice-feedback')).toBeNull();
        fireEvent.click(screen.getByTestId('question-choice-0'));
        if (questionIndex < section.questionIds.length - 1) {
          fireEvent.click(screen.getByTestId('exam-next-button'));
        }
      });
      fireEvent.click(screen.getByTestId('exam-section-button'));
      expect(screen.getByTestId('confirm-dialog')).toBeTruthy();
      fireEvent.click(screen.getByTestId('confirm-ok-button'));
      if (sectionIndex < exam.sections.length - 1) {
        // 次のセクションの 1 問目に移っている
        expect(screen.getByTestId('exam-position').textContent).toContain(
          `Bagian ${sectionIndex + 2} dari ${exam.sections.length}`,
        );
      }
    });

    const ids = examQuestionIds(exam);
    const correct = ids.filter((id) => questionsById.get(id)!.answerIndex === 0).length;
    const [result] = storage.loadResults();
    expect(result).toBeDefined();
    expect(result!.estimatedScore).toBe(estimateScore(correct, ids.length));
    expect(Object.keys(result!.answers)).toHaveLength(ids.length);
    expect(storage.loadAttempt()).toBeNull(); // BR-E13
    expect(window.location.hash).toBe('#/result/0');
  });

  it('未解答が残っていると、確認の文言で知らせる', () => {
    startAttempt();
    render(<ExamRun examId={EXAM_ID} />);
    fireEvent.click(screen.getByTestId('exam-section-button'));
    expect(screen.getByTestId('confirm-message').textContent).toContain(
      `${exam.sections[0]!.questionIds.length} soal`,
    );
    fireEvent.click(screen.getByTestId('confirm-cancel-button'));
    expect(screen.queryByTestId('confirm-dialog')).toBeNull();
  });

  it('聴解以外では、問題番号から自由に移動でき、解答を変えられる (BR-E4)', () => {
    startAttempt();
    render(<ExamRun examId={EXAM_ID} />);
    fireEvent.click(screen.getByTestId('question-choice-1'));
    fireEvent.click(screen.getByTestId('question-nav-item-3'));
    expect(screen.getByTestId('exam-position').textContent).toContain('Soal 4 dari');
    fireEvent.click(screen.getByTestId('exam-prev-button'));
    fireEvent.click(screen.getByTestId('question-nav-item-0'));
    fireEvent.click(screen.getByTestId('question-choice-2'));
    expect(storage.loadAttempt()!.answers[exam.sections[0]!.questionIds[0]!]).toBe(2);
  });

  it('聴解では前に戻るボタンも問題番号の一覧も出ない (BR-E5)', () => {
    startAttempt({ sectionIndex: LISTENING, questionIndex: 1 });
    render(<ExamRun examId={EXAM_ID} />);
    expect(screen.queryByTestId('exam-prev-button')).toBeNull();
    expect(screen.queryByTestId('question-nav')).toBeNull();
    // 最後の問題まで、次のセクションへは進めない
    expect(screen.queryByTestId('exam-section-button')).toBeNull();
    expect(screen.getByTestId('exam-next-button')).toBeTruthy();
  });

  it('聴解の音声は 2 回再生すると押せなくなる (BR-E6)', () => {
    const questionId = exam.sections[LISTENING]!.questionIds[0]!;
    startAttempt({ sectionIndex: LISTENING, audioPlays: { [questionId]: 2 } });
    render(<ExamRun examId={EXAM_ID} />);
    expect((screen.getByTestId('audio-play-button') as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByTestId('audio-remaining').textContent).toBe('Audio sudah diputar 2 kali');
  });

  it('設問の現地語訳は、ボタンを押したときだけ表示する (BR-E8)', () => {
    startAttempt();
    render(<ExamRun examId={EXAM_ID} />);
    expect(screen.queryByTestId('question-instruction')).toBeNull();
    fireEvent.click(screen.getByTestId('exam-instruction-toggle'));
    expect(screen.getByTestId('question-instruction').textContent).not.toBe('');
  });

  it('中断した位置と解答から再開できる (BR-E12)', () => {
    const questionId = exam.sections[1]!.questionIds[2]!;
    startAttempt({ sectionIndex: 1, questionIndex: 2, answers: { [questionId]: 2 }, remainingSec: 99 });
    render(<ExamRun examId={EXAM_ID} />);
    expect(screen.getByTestId('exam-position').textContent).toContain('Bagian 2 dari');
    expect(screen.getByTestId('exam-position').textContent).toContain('Soal 3 dari');
    expect(screen.getByTestId('question-choice-2').getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByTestId('exam-timer').textContent).toContain('1:39');
  });

  it('受験中の記録がないときは何も表示せず、説明画面へ戻す', () => {
    const { container } = render(<ExamRun examId={EXAM_ID} />);
    expect(container.innerHTML).toBe('');
    expect(window.location.hash).toBe(`#/exam/${EXAM_ID}`);
  });
});

describe('結果と振り返り', () => {
  const seedResult = () => {
    startAttempt();
    render(<ExamRun examId={EXAM_ID} />);
    // 何も解答せずに最後まで進む
    exam.sections.forEach((section, i) => {
      if (i === LISTENING) {
        section.questionIds.slice(1).forEach(() => fireEvent.click(screen.getByTestId('exam-next-button')));
      }
      fireEvent.click(screen.getByTestId('exam-section-button'));
      fireEvent.click(screen.getByTestId('confirm-ok-button'));
    });
    cleanup();
  };

  it('未解答はすべて不正解になり、目安である旨を表示する (BR-E10, BR-S4)', () => {
    seedResult();
    render(<ExamResultScreen index={0} />);
    expect(screen.getByTestId('result-score').textContent).toBe('10');
    expect(screen.getByTestId('result-band').textContent).toContain('di bawah A1');
    expect(screen.getByTestId('result-notice').textContent).toContain('perkiraan');
    expect(screen.getByTestId('result-section-listening').textContent).toContain(
      `0/${exam.sections[LISTENING]!.questionIds.length}`,
    );
  });

  it('振り返りで、自分の解答・正解・解説を見られる (BR-S5)', () => {
    seedResult();
    render(<Review index={0} />);
    expect(screen.getByTestId('explanation').textContent).toContain('Tidak dijawab');
    expect(screen.getByTestId('explanation-text').textContent).not.toBe('');
    fireEvent.click(screen.getByTestId('review-next-button'));
    expect(screen.getByTestId('question-nav-item-1').getAttribute('aria-current')).toBe('true');
  });

  it('存在しない結果は「見つかりません」を出す', () => {
    render(<ExamResultScreen index={5} />);
    expect(screen.getByTestId('result-not-found')).toBeTruthy();
  });
});
