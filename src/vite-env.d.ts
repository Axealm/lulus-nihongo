/// <reference types="vite/client" />

/** package.json の version(vite.config.ts の define で埋め込む) */
declare const __APP_VERSION__: string;

interface ImportMetaEnv {
  /** 誤り報告フォームの URL。{id} と {version} が置き換わる。未設定ならボタンを出さない */
  readonly VITE_REPORT_FORM_URL?: string;
  /** 学校・企業向けの問い合わせフォームの URL。未設定なら紹介画面にリンクを出さない */
  readonly VITE_CONTACT_FORM_URL?: string;
}
