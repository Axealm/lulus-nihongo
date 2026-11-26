// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/preact';
import { getSet, questionsById } from '../../src/content';
import { storage } from '../../src/services';
import { Practice } from '../../src/ui/screens/Practice';

const SET_ID = 'vocabulary-01';
const set = getSet(SET_ID)!;
const questionAt = (index: number) => questionsById.get(set.questionIds[index]!)!;
const answerOf = (index: number) => questionAt(index).answerIndex;
/** 正解ではない選択肢を 1 つ返す(選択肢の数が変わっても使えるようにする) */
const wrongOf = (index: number) => (answerOf(index) + 1) % questionAt(index).choices.length;

beforeEach(() => localStorage.clear());
afterEach(cleanup);

describe('練習モード', () => {
  it('解答するまで解説は出ない', () => {
    render(<Practice setId={SET_ID} />);
    expect(screen.queryByTestId('explanation')).toBeNull();
    expect(screen.queryByTestId('practice-feedback')).toBeNull();
    // BR-P5: 設問の現地語訳は最初から表示する
    expect(screen.getByTestId('question-instruction').textContent).not.toBe('');
  });

  it('正解すると「Benar!」と解説が出て、選び直せない (BR-P3)', () => {
    render(<Practice setId={SET_ID} />);
    fireEvent.click(screen.getByTestId(`question-choice-${answerOf(0)}`));
    expect(screen.getByTestId('practice-feedback').textContent).toBe('Benar!');
    expect(screen.getByTestId('explanation-text').textContent).not.toBe('');
    expect((screen.getByTestId('question-choice-0') as HTMLButtonElement).disabled).toBe(true);
  });

  it('不正解のときは「Kurang tepat」と正解が出る', () => {
    render(<Practice setId={SET_ID} />);
    fireEvent.click(screen.getByTestId(`question-choice-${wrongOf(0)}`));
    expect(screen.getByTestId('practice-feedback').textContent).toBe('Kurang tepat');
    const question = questionsById.get(set.questionIds[0]!)!;
    expect(screen.getByTestId('explanation-answer').textContent).toBe(
      question.choices[question.answerIndex],
    );
  });

  it('最後まで解くと正解数が出て、進み具合が保存される (BR-P6)', () => {
    render(<Practice setId={SET_ID} />);
    const total = set.questionIds.length;
    for (let i = 0; i < total; i += 1) {
      // 1 問目だけ間違え、残りは正解する
      const choice = i === 0 ? wrongOf(i) : answerOf(i);
      fireEvent.click(screen.getByTestId(`question-choice-${choice}`));
      fireEvent.click(screen.getByTestId('practice-next-button'));
    }
    expect(screen.getByTestId('practice-result-score').textContent).toBe(
      `${total - 1} dari ${total} benar`,
    );
    expect(storage.loadProgress()[SET_ID]).toMatchObject({ answered: total, correct: total - 1 });
  });

  it('途中でやめた場合は保存されない (BR-P6)', () => {
    render(<Practice setId={SET_ID} />);
    fireEvent.click(screen.getByTestId('question-choice-0'));
    cleanup();
    expect(storage.loadProgress()[SET_ID]).toBeUndefined();
  });

  it('存在しないセットは「見つかりません」を出す', () => {
    render(<Practice setId="no-such-set" />);
    expect(screen.getByTestId('not-found')).toBeTruthy();
  });
});
