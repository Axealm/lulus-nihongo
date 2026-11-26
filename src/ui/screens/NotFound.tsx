import { t } from '../../i18n';
import { Layout } from '../components/Layout';

export function NotFound() {
  return (
    <Layout title={t('app.name')} back="/">
      <p data-testid="not-found">{t('common.notFound')}</p>
      <a class="btn" href="#/">
        {t('common.home')}
      </a>
    </Layout>
  );
}
