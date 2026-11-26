import type { ComponentChildren } from 'preact';
import { t } from '../../i18n';

interface Props {
  title: string;
  /** 戻り先のパス。指定しないと戻るリンクを出さない */
  back?: string;
  children: ComponentChildren;
}

export function Layout({ title, back, children }: Props) {
  return (
    <div class="screen">
      <header class="topbar">
        {back !== undefined && (
          <a class="topbar-back" href={`#${back}`} data-testid="layout-back-link">
            ‹ {t('common.back')}
          </a>
        )}
        <h1 class="topbar-title">{title}</h1>
      </header>
      <main class="content">{children}</main>
    </div>
  );
}
