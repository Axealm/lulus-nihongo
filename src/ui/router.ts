// URL の # 以降を使った、最小限の画面切り替え
import { useEffect, useState } from 'preact/hooks';

interface LeaveGuard {
  /** この画面から離れようとしたら止める */
  path: string;
  onBlocked: () => void;
}

let guard: LeaveGuard | null = null;

/** 模擬試験中に「戻る」で画面を離れるのを止めるために使う */
export function setLeaveGuard(next: LeaveGuard | null): void {
  guard = next;
}

const currentPath = (): string => window.location.hash.replace(/^#/, '') || '/';

export function navigate(path: string, options?: { force?: boolean }): void {
  if (options?.force) guard = null;
  window.location.hash = path;
}

export function useRoute(): string {
  const [route, setRoute] = useState(currentPath);
  useEffect(() => {
    const onChange = () => {
      const next = currentPath();
      if (guard && next !== guard.path) {
        const blocked = guard;
        window.location.hash = blocked.path;
        blocked.onBlocked();
        return;
      }
      setRoute(next);
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return route;
}
