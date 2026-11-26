import { setsOf } from '../../content';
import { SECTIONS } from '../../domain/types';
import { t } from '../../i18n';
import { storage } from '../../services';
import { Layout } from '../components/Layout';

/** セクションと練習セットを選ぶ画面(BR-P1) */
export function SectionSelect() {
  const progress = storage.loadProgress();
  return (
    <Layout title={t('practice.title')} back="/">
      {SECTIONS.map((section) => (
        <section class="group" key={section}>
          <h2 class="group-title">{t(`section.${section}`)}</h2>
          {setsOf(section).map((set, i) => {
            const done = progress[set.id];
            return (
              <a
                class="card card-link card-row"
                key={set.id}
                href={`#/practice/${set.id}`}
                data-testid={`practice-set-link-${set.id}`}
              >
                <span>
                  <strong>{t('practice.set', { n: i + 1 })}</strong>
                  {' · '}
                  {t('practice.questions', { n: set.questionIds.length })}
                </span>
                <span class="muted">
                  {done
                    ? t('practice.lastScore', { correct: done.correct, total: done.answered })
                    : t('practice.notDone')}
                </span>
              </a>
            );
          })}
        </section>
      ))}
    </Layout>
  );
}
