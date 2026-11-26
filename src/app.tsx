import { useEffect, useState } from 'preact/hooks';
import { t } from './i18n';
import { isStorageUnavailable, onStorageUnavailable } from './services';
import { useRoute } from './ui/router';
import { About } from './ui/screens/About';
import { ExamIntro, ExamList } from './ui/screens/ExamIntro';
import { ExamResultScreen, Review } from './ui/screens/ExamResult';
import { ExamRun } from './ui/screens/ExamRun';
import { Home } from './ui/screens/Home';
import { NotFound } from './ui/screens/NotFound';
import { Practice } from './ui/screens/Practice';
import { SectionSelect } from './ui/screens/SectionSelect';

function Screen({ route }: { route: string }) {
  const [first, second, third] = route.split('/').filter(Boolean);

  if (!first) return <Home key={route} />;

  if (first === 'practice') {
    return second ? <Practice key={second} setId={second} /> : <SectionSelect />;
  }

  if (first === 'exam') {
    if (!second) return <ExamList />;
    return third === 'run' ? (
      <ExamRun key={second} examId={second} />
    ) : (
      <ExamIntro key={second} examId={second} />
    );
  }

  if (first === 'result' && second !== undefined && /^\d+$/.test(second)) {
    const index = Number(second);
    return third === 'review' ? (
      <Review key={route} index={index} />
    ) : (
      <ExamResultScreen index={index} />
    );
  }

  if (first === 'about') return <About />;

  return <NotFound />;
}

export function App() {
  const route = useRoute();
  const [storageNotice, setStorageNotice] = useState(isStorageUnavailable);

  useEffect(() => onStorageUnavailable(() => setStorageNotice(true)), []);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [route]);

  return (
    <>
      {storageNotice && (
        <p class="banner" role="status" data-testid="storage-notice">
          {t('notice.storage')}
        </p>
      )}
      <Screen route={route} />
    </>
  );
}
