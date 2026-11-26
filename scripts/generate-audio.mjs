// 聴解問題の音声を VOICEVOX で生成し、ffmpeg で MP3 にする。
//
// 前提: VOICEVOX エンジンが起動していること(既定 http://127.0.0.1:50021)、ffmpeg に PATH が通っていること。
// 実行: npm run audio            … まだ音声がない問題だけ生成する
//       npm run audio -- --force … すべて作り直す
//       npm run audio -- --dry-run … 音声は作らず、VOICEVOX の読み方だけを表示する
//
// transcript の各行は「おんな：…」「おとこ：…」の形式で書く。話者ごとに声を変える。
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';

const ENGINE = process.env.VOICEVOX_URL ?? 'http://127.0.0.1:50021';
// 話者ラベル → VOICEVOX のキャラクター名(スタイルは「ノーマル」を使う)
const VOICES = { おんな: '四国めたん', おとこ: '玄野武宏' };
const SPEED = 0.9; // 学習者向けに少しゆっくり
const LEAD_SEC = 0.3; // 冒頭の無音
const GAP_SEC = 0.5; // 発話のあいだの無音
const SAMPLE_RATE = 24000;

const root = process.cwd();
const force = process.argv.includes('--force');
const dryRun = process.argv.includes('--dry-run');

async function api(path, init) {
  const res = await fetch(`${ENGINE}${path}`, init);
  if (!res.ok) throw new Error(`VOICEVOX ${path} が失敗しました: ${res.status} ${await res.text()}`);
  return res;
}

async function resolveSpeakerIds() {
  const speakers = await (await api('/speakers')).json();
  const ids = {};
  for (const [label, name] of Object.entries(VOICES)) {
    const speaker = speakers.find((s) => s.name === name);
    const style = speaker?.styles.find((s) => s.name === 'ノーマル') ?? speaker?.styles[0];
    if (!style) throw new Error(`VOICEVOX に「${name}」が見つかりません`);
    ids[label] = style.id;
  }
  return ids;
}

/** WAV から PCM データ部分だけを取り出す */
function pcmOf(wav) {
  let offset = 12; // "RIFF" + サイズ + "WAVE"
  while (offset + 8 <= wav.length) {
    const id = wav.toString('ascii', offset, offset + 4);
    const size = wav.readUInt32LE(offset + 4);
    if (id === 'data') return wav.subarray(offset + 8, offset + 8 + size);
    offset += 8 + size + (size % 2);
  }
  throw new Error('WAV に data チャンクがありません');
}

/** 16bit・モノラルの PCM を WAV にする */
function wavOf(pcm) {
  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + pcm.length, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20); // PCM
  header.writeUInt16LE(1, 22); // モノラル
  header.writeUInt32LE(SAMPLE_RATE, 24);
  header.writeUInt32LE(SAMPLE_RATE * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(pcm.length, 40);
  return Buffer.concat([header, pcm]);
}

const silence = (sec) => Buffer.alloc(Math.round(SAMPLE_RATE * sec) * 2);

async function synthesize(text, speakerId) {
  const queryRes = await api(
    `/audio_query?speaker=${speakerId}&text=${encodeURIComponent(text)}`,
    { method: 'POST' },
  );
  const query = await queryRes.json();
  query.speedScale = SPEED;
  query.outputSamplingRate = SAMPLE_RATE;
  query.outputStereo = false;
  const wavRes = await api(`/synthesis?speaker=${speakerId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(query),
  });
  return pcmOf(Buffer.from(await wavRes.arrayBuffer()));
}

function parseTranscript(id, transcript) {
  return transcript.split('\n').map((line) => {
    const match = /^(.+?)：(.+)$/.exec(line.trim());
    if (!match || !(match[1] in VOICES)) {
      throw new Error(`${id}: transcript の行が「おんな：…」「おとこ：…」の形式ではありません: ${line}`);
    }
    return { label: match[1], text: match[2] };
  });
}

// content/questions/ のすべてのファイルから、音声を持つ問題を集める
const questionsDir = join(root, 'content', 'questions');
const questions = readdirSync(questionsDir)
  .filter((name) => name.endsWith('.json'))
  .sort()
  .flatMap((name) => JSON.parse(readFileSync(join(questionsDir, name), 'utf8')))
  .filter((q) => q.audio);

const speakerIds = await resolveSpeakerIds();

if (dryRun) {
  // 音声は作らず、VOICEVOX がどう読むかだけを表示する(読み間違いの確認用)
  for (const q of questions) {
    for (const { label, text } of parseTranscript(q.id, q.transcript)) {
      const res = await api(
        `/audio_query?speaker=${speakerIds[label]}&text=${encodeURIComponent(text)}`,
        { method: 'POST' },
      );
      console.log(`${q.id}\t${(await res.json()).kana}`);
    }
  }
  process.exit(0);
}

const targets = questions.filter((q) => force || !existsSync(join(root, 'public', q.audio)));

if (targets.length === 0) {
  console.log('生成する音声はありません(作り直すときは --force を付けてください)');
  process.exit(0);
}

const tmpWav = join(root, 'node_modules', '.tmp-audio.wav');

for (const q of targets) {
  const parts = [silence(LEAD_SEC)];
  for (const { label, text } of parseTranscript(q.id, q.transcript)) {
    parts.push(await synthesize(text, speakerIds[label]), silence(GAP_SEC));
  }
  const out = join(root, 'public', q.audio);
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(tmpWav, wavOf(Buffer.concat(parts)));
  const result = spawnSync(
    'ffmpeg',
    ['-y', '-loglevel', 'error', '-i', tmpWav, '-ac', '1', '-ar', String(SAMPLE_RATE), '-b:a', '48k', out],
    { stdio: 'inherit' },
  );
  if (result.status !== 0) throw new Error(`${q.id}: ffmpeg での変換に失敗しました`);
  console.log(`生成: ${q.audio}`);
}

rmSync(tmpWav, { force: true });
console.log(`完了: ${targets.length} 本`);
