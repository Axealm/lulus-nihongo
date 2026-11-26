import { render } from 'preact';
import { App } from './app';
import { setLocale } from './i18n';
import { storage } from './services';
import './styles.css';

setLocale(storage.loadSettings().locale);

render(<App />, document.getElementById('app')!);
