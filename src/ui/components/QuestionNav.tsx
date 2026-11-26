interface Props {
  count: number;
  current: number;
  /** 解答済みの問題に印を付ける */
  answered?: boolean[];
  /** 振り返り用: 正誤で色を付ける */
  marks?: ('correct' | 'wrong')[];
  onGo: (index: number) => void;
}

/** 問題番号の一覧。押すとその問題に移動する */
export function QuestionNav({ count, current, answered, marks, onGo }: Props) {
  return (
    <nav class="qnav" data-testid="question-nav">
      {Array.from({ length: count }, (_, i) => {
        const classes = ['qnav-item'];
        if (i === current) classes.push('is-current');
        if (answered?.[i]) classes.push('is-answered');
        if (marks?.[i]) classes.push(`is-${marks[i]}`);
        return (
          <button
            type="button"
            key={i}
            class={classes.join(' ')}
            aria-current={i === current}
            data-testid={`question-nav-item-${i}`}
            onClick={() => onGo(i)}
          >
            {i + 1}
          </button>
        );
      })}
    </nav>
  );
}
