import type { ComponentChildren } from 'preact';
import type { Question } from '../../domain/types';
import { assetUrl } from '../../services';

/** `__下線__` を下線付きの文字にする */
export function RichText({ text }: { text: string }) {
  const parts = text.split(/__(.+?)__/g);
  return <>{parts.map((part, i) => (i % 2 === 1 ? <u key={i}>{part}</u> : part))}</>;
}

interface Props {
  question: Question;
  /** 設問の現地語訳。渡したときだけ表示する */
  instruction?: string;
  selected: number | null;
  /** 渡さないと選択肢を押せない(振り返りなど) */
  onSelect?: (index: number) => void;
  /** 正解と不正解を色で示す */
  reveal: boolean;
  /** 本文と問題文のあいだに置くもの(音声プレーヤー) */
  children?: ComponentChildren;
}

/** 問題文、本文、画像、選択肢を表示する。練習・模擬試験・振り返りで共用する */
export function QuestionView({ question, instruction, selected, onSelect, reveal, children }: Props) {
  return (
    <div class="question">
      {instruction && (
        <p class="instruction" data-testid="question-instruction">
          {instruction}
        </p>
      )}
      {question.image && <img class="question-image" src={assetUrl(question.image)} alt="" />}
      {question.passage && (
        <div class="passage ja" lang="ja" data-testid="question-passage">
          {question.passage}
        </div>
      )}
      {children}
      <p class="prompt ja" lang="ja" data-testid="question-prompt">
        <RichText text={question.prompt} />
      </p>
      <div class="choices">
        {question.choices.map((choice, i) => {
          const classes = ['choice'];
          if (selected === i) classes.push('is-selected');
          if (reveal && i === question.answerIndex) classes.push('is-correct');
          if (reveal && selected === i && i !== question.answerIndex) classes.push('is-wrong');
          return (
            <button
              type="button"
              key={i}
              class={classes.join(' ')}
              disabled={reveal || !onSelect}
              aria-pressed={selected === i}
              data-testid={`question-choice-${i}`}
              onClick={() => onSelect?.(i)}
            >
              <span class="choice-no">{i + 1}</span>
              <span class="ja" lang="ja">
                {choice}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
