import {
  CATEGORIES,
  LEVELS,
  SECTIONS,
  SECTION_PREFIX,
  type ContentBundle,
  type Question,
  type Section,
} from './types';

export interface Violation {
  /** 違反した業務ルールの ID(BR-D1 など) */
  rule: string;
  /** 違反した問題・セット・模擬試験の ID */
  target: string;
  message: string;
}

const isSection = (value: unknown): value is Section =>
  typeof value === 'string' && (SECTIONS as readonly string[]).includes(value);

const isNonEmpty = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

/**
 * 問題データ一式を検証する(BR-D1〜BR-D10)。
 * fileExists を渡したときだけ、音声と画像の実在(BR-D9)も調べる。
 */
export function validateContent(
  bundle: ContentBundle,
  fileExists?: (path: string) => boolean,
): Violation[] {
  const violations: Violation[] = [];
  const add = (rule: string, target: string, message: string) =>
    violations.push({ rule, target, message });

  const byId = new Map<string, Question>();
  /** 問題の中身 → 最初にその中身で登場した問題の ID(BR-D10) */
  const bodies = new Map<string, string>();

  for (const q of bundle.questions) {
    const id = isNonEmpty(q.id) ? q.id : '(ID なし)';

    // BR-D10: 同じ問題が 2 回ないこと(同じ文章に別の設問が付くのは構わない)
    const body = [q.section, q.prompt, q.passage ?? '', q.transcript ?? ''].join('\u0000');
    const sameAs = bodies.get(body);
    if (sameAs) add('BR-D10', id, `問題 ${sameAs} と同じ内容です`);
    else bodies.set(body, id);

    // BR-D1
    if (!isNonEmpty(q.id)) add('BR-D1', id, '問題 ID がありません');
    else if (byId.has(q.id)) add('BR-D1', id, '問題 ID が重複しています');
    else byId.set(q.id, q);

    if (!isSection(q.section)) {
      add('BR-D1', id, `セクション「${String(q.section)}」は定義されていません`);
    } else {
      if (isNonEmpty(q.id) && !q.id.startsWith(SECTION_PREFIX[q.section])) {
        add('BR-D1', id, `ID の接頭辞が「${SECTION_PREFIX[q.section]}」ではありません`);
      }
      // BR-D5
      if (!CATEGORIES[q.section].includes(q.category)) {
        add('BR-D5', id, `カテゴリ「${String(q.category)}」は ${q.section} では使えません`);
      }
      // BR-D4
      if (q.section === 'listening') {
        if (!isNonEmpty(q.audio)) add('BR-D4', id, '聴解の問題に audio がありません');
        if (!isNonEmpty(q.transcript)) add('BR-D4', id, '聴解の問題に transcript がありません');
      }
    }

    if (!isNonEmpty(q.prompt)) add('BR-D1', id, '問題文(prompt)が空です');
    if (!(LEVELS as readonly string[]).includes(q.level)) {
      add('BR-D1', id, `level「${String(q.level)}」は定義されていません`);
    }

    // BR-D2
    const choices: unknown[] = Array.isArray(q.choices) ? q.choices : [];
    if (choices.length < 3 || choices.length > 4) {
      add('BR-D2', id, `選択肢は 3 個または 4 個にしてください(現在 ${choices.length} 個)`);
    }
    if (choices.some((c) => !isNonEmpty(c))) add('BR-D2', id, '空の選択肢があります');
    if (new Set(choices).size !== choices.length) add('BR-D2', id, '選択肢が重複しています');

    // BR-D3
    if (!Number.isInteger(q.answerIndex) || q.answerIndex < 0 || q.answerIndex >= choices.length) {
      add('BR-D3', id, `answerIndex(${String(q.answerIndex)})が選択肢の範囲外です`);
    }

    // BR-D9
    if (fileExists) {
      for (const path of [q.audio, q.image]) {
        if (isNonEmpty(path) && !fileExists(path)) {
          add('BR-D9', id, `ファイルがありません: ${path}`);
        }
      }
    }
  }

  // BR-D6
  for (const [locale, list] of Object.entries(bundle.translations)) {
    const seen = new Set<string>();
    for (const t of list) {
      if (!byId.has(t.id)) add('BR-D6', t.id, `[${locale}] 対応する問題がありません`);
      if (seen.has(t.id)) add('BR-D6', t.id, `[${locale}] 現地語データが重複しています`);
      seen.add(t.id);
      if (!isNonEmpty(t.instruction)) add('BR-D6', t.id, `[${locale}] instruction が空です`);
      if (!isNonEmpty(t.explanation)) add('BR-D6', t.id, `[${locale}] explanation が空です`);
    }
    for (const id of byId.keys()) {
      if (!seen.has(id)) add('BR-D6', id, `[${locale}] 現地語データがありません`);
    }
  }
  if (Object.keys(bundle.translations).length === 0) {
    add('BR-D6', '(全体)', '現地語データが 1 言語もありません');
  }

  // BR-D7
  const checkReferences = (ownerId: string, section: Section, questionIds: string[]) => {
    for (const qid of questionIds) {
      const q = byId.get(qid);
      if (!q) add('BR-D7', ownerId, `問題 ${qid} がありません`);
      else if (q.section !== section) {
        add('BR-D7', ownerId, `問題 ${qid} は ${section} のセクションではありません`);
      }
    }
  };

  const setIds = new Set<string>();
  for (const set of bundle.sets) {
    if (setIds.has(set.id)) add('BR-D7', set.id, '練習セットの ID が重複しています');
    setIds.add(set.id);
    if (!isSection(set.section)) {
      add('BR-D7', set.id, `セクション「${String(set.section)}」は定義されていません`);
      continue;
    }
    if (set.questionIds.length === 0) add('BR-D7', set.id, '練習セットに問題がありません');
    checkReferences(set.id, set.section, set.questionIds);
  }

  // BR-D8
  const examIds = new Set<string>();
  for (const exam of bundle.exams) {
    if (examIds.has(exam.id)) add('BR-D8', exam.id, '模擬試験の ID が重複しています');
    examIds.add(exam.id);
    if (!(exam.durationSec > 0)) add('BR-D8', exam.id, 'durationSec は正の数にしてください');

    const order = exam.sections.map((s) => s.section);
    if (order.length !== SECTIONS.length || order.some((s, i) => s !== SECTIONS[i])) {
      add('BR-D8', exam.id, `セクションは ${SECTIONS.join(' → ')} の順に 4 つ必要です`);
    }

    const used = new Set<string>();
    for (const s of exam.sections) {
      if (!isSection(s.section)) continue;
      if (s.questionIds.length === 0) add('BR-D8', exam.id, `${s.section} に問題がありません`);
      checkReferences(exam.id, s.section, s.questionIds);
      for (const qid of s.questionIds) {
        if (used.has(qid)) add('BR-D8', exam.id, `問題 ${qid} が 2 回出題されています`);
        used.add(qid);
      }
    }
  }

  return violations;
}
