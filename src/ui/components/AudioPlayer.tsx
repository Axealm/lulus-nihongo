import { useRef, useState } from 'preact/hooks';
import { audioLimit, canPlayAudio, type AudioMode } from '../../domain/exam';
import { t } from '../../i18n';

interface Props {
  src: string;
  mode: AudioMode;
  /** これまでの再生回数(模擬試験でだけ意味を持つ) */
  plays: number;
  /** 再生が実際に始まったときに呼ばれる */
  onPlay?: () => void;
}

/** 聴解の音声。模擬試験では再生回数を制限する(BR-E6) */
export function AudioPlayer({ src, mode, plays, onPlay }: Props) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [failed, setFailed] = useState(false);

  const limit = audioLimit(mode);
  const allowed = canPlayAudio(plays, mode);

  const play = () => {
    const audio = audioRef.current;
    if (!audio || playing || !allowed) return;
    setFailed(false);
    try {
      audio.currentTime = 0;
    } catch {
      // まだ読み込まれていないときは先頭から始まるので、そのままでよい
    }
    // 再生が始まってから回数を数える(通信エラーで回数だけ減るのを防ぐ)
    Promise.resolve(audio.play())
      .then(() => {
        setPlaying(true);
        onPlay?.();
      })
      .catch(() => setFailed(true));
  };

  return (
    <div class="audio">
      <audio
        ref={audioRef}
        src={src}
        preload="auto"
        onEnded={() => setPlaying(false)}
        onError={() => {
          setPlaying(false);
          setFailed(true);
        }}
      />
      <button
        type="button"
        class="btn btn-audio"
        disabled={playing || !allowed}
        data-testid="audio-play-button"
        onClick={play}
      >
        ▶ {playing ? t('audio.playing') : t('audio.play')}
      </button>
      {limit !== null && (
        <span class="audio-count" data-testid="audio-remaining">
          {allowed ? t('audio.remaining', { n: limit - plays }) : t('audio.noMore')}
        </span>
      )}
      {failed && (
        <p class="error" data-testid="audio-error">
          {t('audio.error')}
        </p>
      )}
    </div>
  );
}
