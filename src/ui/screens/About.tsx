import { audioCredit } from '../../content';
import { t } from '../../i18n';
import { APP_VERSION, CONTACT_FORM_URL } from '../../services';
import { Layout } from '../components/Layout';

/** アプリについて(BR-N1、BR-N2) */
export function About() {
  return (
    <Layout title={t('about.title')} back="/">
      <section class="card">
        <p data-testid="about-unofficial">{t('about.unofficial')}</p>
        <p>{t('about.content')}</p>
        <p>{t('about.translation')}</p>
        <p>{t('about.privacy')}</p>
      </section>
      {CONTACT_FORM_URL && (
        <section class="card">
          <p>{t('about.contact')}</p>
          <a
            class="report-link"
            href={CONTACT_FORM_URL}
            target="_blank"
            rel="noopener noreferrer"
            data-testid="about-contact-link"
          >
            {t('about.contactLink')}
          </a>
        </section>
      )}
      <section class="card">
        <p data-testid="about-audio-credit">{t('about.audio', { credit: audioCredit })}</p>
        <p class="muted" data-testid="about-version">
          {t('about.version', { version: APP_VERSION })}
        </p>
      </section>
    </Layout>
  );
}
