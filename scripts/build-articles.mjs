// 検索から人を呼ぶためのページを作る。vite build のあとに実行する(npm run build に含まれている)。
//   - site/articles/*.md      → dist/panduan/<スラッグ>/(記事)
//   - site/pages/*.md         → dist/panduan/<スラッグ>/(運営者の説明など。記事の一覧には出さない)
//   - content/ の問題データ   → dist/panduan/contoh-soal-…/(問題の見本ページ)
//   - dist/404.html、dist/sitemap.xml、dist/robots.txt、dist/og/*.png(共有用の画像)
// 記事の書き方は site/README.md を参照。
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { marked } from 'marked';
import { Resvg } from '@resvg/resvg-js';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ARTICLES = join(ROOT, 'site', 'articles');
const PAGES = join(ROOT, 'site', 'pages');
const CONTENT = join(ROOT, 'content');
const DIST = join(ROOT, 'dist');
const SECTION = 'panduan'; // ページを置くパス(インドネシア語で「ガイド」)
const SITE_URL = (process.env.SITE_URL ?? 'https://lulusnihongo.com').replace(/\/$/, '');
const REQUIRED = ['title', 'description', 'date', 'updated', 'order', 'summaryJa'];

const esc = (s) =>
  String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');

function fail(message) {
  console.error(`記事のビルドに失敗: ${message}`);
  process.exit(1);
}

const readJson = (file) => JSON.parse(readFileSync(file, 'utf8'));

/** .env.production から値を読む(問い合わせフォームの URL をページにも使うため) */
function envValue(name) {
  const file = join(ROOT, '.env.production');
  if (!existsSync(file)) return '';
  const match = readFileSync(file, 'utf8').match(new RegExp(`^${name}=(.*)$`, 'm'));
  return match ? match[1].trim() : '';
}
const CONTACT_URL = envValue('VITE_CONTACT_FORM_URL');

function checkMeta(meta, file) {
  for (const key of REQUIRED) if (!meta[key] && meta[key] !== 0) fail(`${file}: 設定に ${key} がない`);
  for (const key of ['date', 'updated']) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(meta[key])) fail(`${file}: ${key} は YYYY-MM-DD の形で書く`);
  }
  if (meta.description.length > 170) fail(`${file}: description は 170 文字以内にする(現在 ${meta.description.length})`);
}

/** 先頭の --- で囲まれた「キー: 値」の部分と、本文に分ける */
function parse(dir, file) {
  const raw = readFileSync(join(dir, file), 'utf8').replace(/\r\n/g, '\n');
  const match = raw.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) fail(`${file}: 先頭に --- で囲んだ設定がない`);
  const meta = {};
  for (const line of match[1].split('\n')) {
    if (!line.trim()) continue;
    const index = line.indexOf(':');
    if (index < 0) fail(`${file}: 設定の行が「キー: 値」の形になっていない: ${line}`);
    meta[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  checkMeta(meta, file);
  const slug = file.replace(/\.md$/, '');
  if (!/^[a-z0-9-]+$/.test(slug)) fail(`${file}: ファイル名は半角の英小文字、数字、ハイフンだけにする`);
  let body = match[2];
  if (body.includes('{{CONTACT_URL}}')) {
    if (!CONTACT_URL) fail(`${file}: {{CONTACT_URL}} を使っているが、.env.production に VITE_CONTACT_FORM_URL がない`);
    body = body.replaceAll('{{CONTACT_URL}}', CONTACT_URL);
  }
  return { slug, meta, body };
}

const MONTHS = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const dateId = (iso) => {
  const [y, m, d] = iso.split('-').map(Number);
  return `${d} ${MONTHS[m - 1]} ${y}`;
};
const pageUrl = (slug) => `${SITE_URL}/${SECTION}/${slug}/`;
const pagePath = (slug) => `/${SECTION}/${slug}/`;

const CSS = `
:root{--bg:#f5f7fb;--surface:#fff;--text:#1c2430;--muted:#5d6b7e;--border:#d5dbe5;--primary:#1f5fbf}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--text);font-family:system-ui,-apple-system,"Segoe UI",Roboto,"Noto Sans","Noto Sans JP",sans-serif;font-size:17px;line-height:1.7}
a{color:var(--primary)}
.top{background:var(--primary);color:#fff}
.top-inner,.wrap{max-width:720px;margin:0 auto;padding:0 16px}
.top-inner{display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:56px}
.brand{color:#fff;font-weight:700;font-size:18px;text-decoration:none}
.top nav{display:flex;gap:16px}
.top a.nav{color:#fff;font-size:15px}
.wrap{padding-top:20px;padding-bottom:40px}
h1{font-size:28px;line-height:1.3;margin:0 0 8px}
h2{font-size:22px;line-height:1.35;margin:36px 0 10px;padding-top:8px;border-top:1px solid var(--border)}
h3{font-size:18px;margin:24px 0 6px}
.meta{color:var(--muted);font-size:14px;margin:0 0 20px}
.lead{font-size:18px}
table{border-collapse:collapse;width:100%;margin:14px 0;background:var(--surface);font-size:16px}
th,td{border:1px solid var(--border);padding:8px 10px;text-align:left;vertical-align:top}
th{background:#eaf0fb}
.table-wrap{overflow-x:auto}
blockquote{margin:16px 0;padding:10px 14px;background:#fff4d6;border-left:4px solid #e0b400;border-radius:6px}
blockquote p{margin:4px 0}
.cta{margin:32px 0;padding:20px;background:var(--surface);border:1px solid var(--border);border-radius:12px;text-align:center}
.cta p{margin:0 0 12px}
.btn{display:inline-block;background:var(--primary);color:#fff;font-weight:700;text-decoration:none;padding:12px 22px;border-radius:999px}
.card{display:block;background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:16px;margin:14px 0;text-decoration:none;color:inherit}
.card h2,.card h3{border:0;margin:0 0 6px;padding:0;font-size:19px;line-height:1.35;color:var(--primary)}
.card p{margin:0;color:var(--muted);font-size:16px}
footer{border-top:1px solid var(--border);color:var(--muted);font-size:14px;padding:20px 0 40px}
footer p{margin:6px 0}
.cta-mid{margin:28px 0;background:#eaf0fb;border-color:#c5d5f2}
.ad-note{font-size:14px;color:var(--muted);background:var(--surface);border:1px solid var(--border);border-radius:8px;padding:8px 12px;margin:0 0 20px}
.ad-tag{display:inline-block;margin-left:6px;padding:0 6px;font-size:12px;line-height:1.6;color:var(--muted);border:1px solid var(--border);border-radius:4px;vertical-align:middle}
.sticky{position:fixed;left:0;right:0;bottom:0;z-index:10;background:var(--surface);border-top:1px solid var(--border);padding:8px 16px;display:flex;align-items:center;justify-content:center;gap:12px;font-size:14px;line-height:1.3}
.sticky .btn{padding:8px 16px;font-size:14px;white-space:nowrap}
body.has-sticky footer{padding-bottom:96px}
.crumbs{font-size:14px;color:var(--muted);margin:0 0 14px}
.crumbs a{color:var(--muted)}
.toc{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:12px 16px;margin:20px 0}
.toc p{margin:0 0 4px;font-weight:700}
.toc ol{margin:0;padding-left:22px}
.toc li{margin:2px 0}
.q{background:var(--surface);border:1px solid var(--border);border-radius:12px;padding:4px 16px 16px;margin:18px 0}
.q h2{border:0;margin:12px 0 4px;padding:0;font-size:19px}
.inst{color:var(--muted);font-size:15px;margin:0 0 10px}
.passage{background:#f1f4f9;border-radius:8px;padding:10px 12px;margin:10px 0;font-size:18px;line-height:1.9}
.prompt{font-size:19px;line-height:1.9;margin:10px 0}
.choices{font-size:18px;line-height:1.9;margin:6px 0 12px;padding-left:28px}
audio{width:100%;margin:6px 0}
details{margin:10px 0 0;border-top:1px dashed var(--border);padding-top:8px}
summary{cursor:pointer;color:var(--primary);font-weight:700}
details p{margin:8px 0 0}
.note{font-size:15px;color:var(--muted)}
`;

const ROBOTS_DEFAULT = 'index, follow, max-image-preview:large';

function page({ title, description, url, type, body, jsonLd = [], image, robots = ROBOTS_DEFAULT, fullTitle }) {
  const ld = jsonLd
    .map((item) => `<script type="application/ld+json">${JSON.stringify(item).replaceAll('<', '\\u003c')}</script>`)
    .join('\n');
  return `<!doctype html>
<html lang="id">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<meta name="theme-color" content="#1f5fbf">
<title>${esc(fullTitle ?? `${title} | Lulus Nihongo`)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="${robots}">
${url ? `<link rel="canonical" href="${esc(url)}">` : ''}
<link rel="icon" type="image/png" href="/icons/icon-192.png">
<meta property="og:type" content="${type}">
<meta property="og:site_name" content="Lulus Nihongo">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
${url ? `<meta property="og:url" content="${esc(url)}">` : ''}
<meta property="og:image" content="${esc(image.url)}">
${image.large ? '<meta property="og:image:width" content="1200">\n<meta property="og:image:height" content="630">' : ''}
<meta property="og:locale" content="id_ID">
<meta name="twitter:card" content="${image.large ? 'summary_large_image' : 'summary'}">
${ld}
<style>${CSS}</style>
</head>
<body class="has-sticky">
<header class="top"><div class="top-inner">
<a class="brand" href="/">Lulus Nihongo</a>
<nav><a class="nav" href="/${SECTION}/contoh-soal-jft-basic/">Contoh soal</a><a class="nav" href="/${SECTION}/">Panduan</a></nav>
</div></header>
<main class="wrap">
${body}
</main>
<footer><div class="wrap" style="padding-top:0;padding-bottom:0">
<p>Lulus Nihongo adalah situs dan aplikasi tidak resmi. Kami tidak berafiliasi dengan The Japan Foundation maupun pemerintah Jepang.</p>
<p>Aturan ujian, visa, dan angka dapat berubah. Sebelum mengambil keputusan, periksa kembali sumber resmi yang kami cantumkan di setiap artikel.</p>
<p>Artikel ditulis oleh tim Lulus Nihongo dengan bantuan AI, berdasarkan sumber resmi.</p>
<p><a href="/${SECTION}/tentang/">Tentang kami dan kebijakan editorial</a> · <a href="/${SECTION}/">Semua panduan</a> · <a href="/">Aplikasi</a></p>
</div></footer>
<div class="sticky"><span>Latihan soal JFT-Basic, gratis</span><a class="btn" href="/">Buka aplikasi</a></div>
</body>
</html>
`;
}

const CTA = `<div class="cta">
<p><strong>Latihan soal untuk JFT-Basic, gratis.</strong><br>200 soal latihan dan 1 simulasi ujian 60 menit, dengan pembahasan Bahasa Indonesia. Tanpa login.</p>
<a class="btn" href="/">Buka Lulus Nihongo</a>
</div>`;

// ページの途中に入れる案内
const MID_CTA = `<div class="cta cta-mid">
<p><strong>Sedang menyiapkan ujian JFT-Basic?</strong><br>Coba 200 soal latihan gratis, dengan pembahasan Bahasa Indonesia.</p>
<a class="btn" href="/">Mulai latihan</a>
</div>`;

// 広告リンクがある記事の冒頭に入れる断り書き
const AD_NOTE = `<p class="ad-note">Artikel ini memuat tautan afiliasi (bertanda “Iklan”). Jika Anda mendaftar atau membeli melalui tautan tersebut, Lulus Nihongo dapat menerima komisi dari penyedia layanan.</p>`;

/** [文字](https://… "aff") と書いたリンクを、広告リンクとして整える。広告リンクがあれば hasAds が true */
function markAds(html, file) {
  let hasAds = false;
  const out = html.replace(/<a href="([^"]*)" title="aff">([\s\S]*?)<\/a>/g, (_, href, text) => {
    if (!/^https:\/\//.test(href)) fail(`${file}: 広告リンクは https:// で始まる外部の URL にする: ${href}`);
    hasAds = true;
    return `<a class="aff" href="${href}" rel="sponsored nofollow noopener" target="_blank">${text}</a><span class="ad-tag">Iklan</span>`;
  });
  return { html: out, hasAds };
}

/** n 番目の見出し(h2)の前に、アプリへの案内を入れる。見出しが足りなければ入れない */
function insertMidCta(html, nth = 3) {
  let count = 0;
  return html.replace(/<h2/g, (m) => (++count === nth ? `${MID_CTA}\n<h2` : m));
}

const slugify = (text) =>
  text.replace(/<[^>]+>/g, '').replace(/&[a-z]+;/g, ' ').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'bagian';

/** 見出し(h2)に id を付け、目次の項目を集める */
function addHeadingIds(html) {
  const used = new Set();
  const toc = [];
  const out = html.replace(/<h2>([\s\S]*?)<\/h2>/g, (_, inner) => {
    const base = slugify(inner);
    let id = base;
    for (let n = 2; used.has(id); n++) id = `${base}-${n}`;
    used.add(id);
    toc.push({ id, text: inner.replace(/<[^>]+>/g, '') });
    return `<h2 id="${id}">${inner}</h2>`;
  });
  return { html: out, toc };
}

/** 最初の段落のあとに目次を入れる(見出しが 3 つ以上あるとき) */
function insertToc(html, toc) {
  if (toc.length < 3) return html;
  const nav =
    `<nav class="toc" aria-label="Isi artikel"><p>Isi artikel</p><ol>` +
    toc.map((t) => `<li><a href="#${t.id}">${t.text}</a></li>`).join('') +
    `</ol></nav>`;
  let done = false;
  return html.replace(/<\/p>/, (m) => {
    if (done) return m;
    done = true;
    return `${m}\n${nav}`;
  });
}

/** パンくず(画面に出す部分と、検索エンジン向けのデータ) */
function crumbs(items) {
  const html =
    `<nav class="crumbs" aria-label="Breadcrumb">` +
    items.map((it, i) => (i < items.length - 1 ? `<a href="${it.path}">${esc(it.name)}</a>` : `<span>${esc(it.name)}</span>`)).join(' › ') +
    `</nav>`;
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({ '@type': 'ListItem', position: i + 1, name: it.name, item: `${SITE_URL}${it.path}` })),
  };
  return { html, jsonLd };
}

const HOME = { name: 'Beranda', path: '/' };
const GUIDE = { name: 'Panduan', path: `/${SECTION}/` };

function articleJsonLd(entry, image) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: entry.title,
    description: entry.description,
    inLanguage: 'id',
    datePublished: entry.date,
    dateModified: entry.updated,
    mainEntityOfPage: pageUrl(entry.slug),
    image: image.url,
    author: { '@type': 'Organization', name: 'Lulus Nihongo', url: `${SITE_URL}/${SECTION}/tentang/` },
    publisher: { '@type': 'Organization', name: 'Lulus Nihongo', url: `${SITE_URL}/`, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` } },
  };
}

// ---- 共有用の画像(SNS に貼ったときに出る 1200×630 の画像) ----

const FONT_FILES = ['C:/Windows/Fonts/segoeuib.ttf', 'C:/Windows/Fonts/segoeui.ttf'];
const CAN_DRAW = FONT_FILES.every((file) => existsSync(file));
const FALLBACK_IMAGE = { url: `${SITE_URL}/icons/icon-512.png`, large: false };
if (!CAN_DRAW) console.warn('注意: フォントが見つからないので、共有用の画像は作らない(アイコンを使う)');

function wrapWords(text, max) {
  const lines = [];
  let line = '';
  for (const word of text.split(' ')) {
    if (line && (line + ' ' + word).length > max) {
      lines.push(line);
      line = word;
    } else {
      line = line ? `${line} ${word}` : word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

/** 題名を入れた画像を dist/og/<名前>.png に作り、その URL を返す */
function ogImage(name, title, kicker) {
  if (!CAN_DRAW) return FALLBACK_IMAGE;
  let size = 64;
  let lines = wrapWords(title, 27);
  if (lines.length > 3) {
    size = 54;
    lines = wrapWords(title, 33);
  }
  if (lines.length > 4) lines = [...lines.slice(0, 3), `${lines[3]}…`];
  const lineHeight = Math.round(size * 1.25);
  const top = 350 - ((lines.length - 1) * lineHeight) / 2; // 題名のかたまりを、上の印と下の URL の間に置く
  const text = lines
    .map((line, i) => `<text x="80" y="${top + i * lineHeight}" font-family="Segoe UI" font-weight="700" font-size="${size}" fill="#fff">${esc(line)}</text>`)
    .join('');
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">` +
    `<defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#16428f"/><stop offset="1" stop-color="#2163c4"/></linearGradient></defs>` +
    `<rect width="1200" height="630" fill="url(#g)"/>` +
    `<circle cx="1110" cy="70" r="210" fill="#fff" opacity="0.06"/><circle cx="60" cy="640" r="230" fill="#fff" opacity="0.06"/>` +
    `<text x="80" y="104" font-family="Segoe UI" font-weight="700" font-size="40" fill="#fff">Lulus Nihongo</text>` +
    `<rect x="80" y="134" width="${kicker.length * 15 + 40}" height="44" rx="22" fill="#ffd84d"/>` +
    `<text x="100" y="164" font-family="Segoe UI" font-weight="700" font-size="24" fill="#16428f">${esc(kicker)}</text>` +
    text +
    `<text x="80" y="560" font-family="Segoe UI" font-weight="700" font-size="30" fill="#fff">lulusnihongo.com</text>` +
    `<text x="1120" y="560" text-anchor="end" font-family="Segoe UI" font-size="24" fill="#cfe0ff">Latihan soal JFT-Basic · tidak resmi</text>` +
    `</svg>`;
  const png = new Resvg(svg, { font: { fontFiles: FONT_FILES, loadSystemFonts: false, defaultFontFamily: 'Segoe UI' } }).render().asPng();
  write(join('og', `${name}.png`), png);
  return { url: `${SITE_URL}/og/${name}.png`, large: true };
}

function write(relative, content) {
  const file = join(DIST, relative);
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, content);
}

if (!existsSync(join(DIST, 'index.html'))) fail('dist/ がない。先に vite build を実行すること');

marked.setOptions({ gfm: true });

// ---- 問題の見本ページ(content/ の問題データから作る) ----

const SAMPLE_DATE = '2026-11-26'; // 見本ページを最初に公開した日
const SAMPLE_UPDATED = '2026-11-26'; // 見本ページの文章や問題を直したら、この日付を変える
const HUB_SLUG = 'contoh-soal-jft-basic';

const SAMPLE_SECTIONS = [
  {
    key: 'vocabulary',
    slug: 'contoh-soal-jft-basic-kosakata',
    name: 'Aksara dan Kosakata',
    ja: '文字と語彙',
    title: 'Contoh Soal JFT-Basic: Aksara dan Kosakata (10 Soal dan Pembahasan)',
    description: '10 contoh soal JFT-Basic bagian Aksara dan Kosakata: arti kata, penggunaan kata, dan cara baca kanji. Lengkap dengan jawaban dan pembahasan Bahasa Indonesia.',
    lead: 'Bagian Aksara dan Kosakata (文字と語彙) menguji apakah Anda mengenal kata dan kanji yang dipakai dalam kehidupan sehari-hari di Jepang. Berikut 10 contoh soal dengan jawaban dan pembahasan.',
    tips: [
      'Baca seluruh kalimat dulu, baru lihat pilihan jawaban.',
      'Hafalkan kanji bersama kata yang sering memakainya, bukan satu per satu.',
      'Pilihan jawaban sering mirip bunyinya. Perhatikan bunyi panjang dan tanda tenten (゛).',
    ],
    summaryJa: '「文字と語彙」の見本 10 問(語の意味、語の使い方、漢字の読み)。答えと解説つき。',
  },
  {
    key: 'conversation',
    slug: 'contoh-soal-jft-basic-percakapan',
    name: 'Percakapan dan Ungkapan',
    ja: '会話と表現',
    title: 'Contoh Soal JFT-Basic: Percakapan dan Ungkapan (10 Soal dan Pembahasan)',
    description: '10 contoh soal JFT-Basic bagian Percakapan dan Ungkapan: tata bahasa dan ungkapan dalam percakapan sehari-hari. Lengkap dengan jawaban dan pembahasan.',
    lead: 'Bagian Percakapan dan Ungkapan (会話と表現) menguji tata bahasa dan ungkapan yang dipakai dalam percakapan sehari-hari. Berikut 10 contoh soal dengan jawaban dan pembahasan.',
    tips: [
      'Baca percakapan sebagai satu kesatuan: siapa yang bertanya, dan jawaban apa yang wajar.',
      'Untuk soal partikel, perhatikan kata kerja di akhir kalimat.',
      'Hafalkan ungkapan tetap seperti salam, permintaan maaf, dan terima kasih, beserta jawabannya.',
    ],
    summaryJa: '「会話と表現」の見本 10 問(文法と表現)。答えと解説つき。',
  },
  {
    key: 'listening',
    slug: 'contoh-soal-jft-basic-menyimak',
    name: 'Menyimak',
    ja: '聴解',
    title: 'Contoh Soal JFT-Basic: Menyimak (10 Soal dengan Audio dan Pembahasan)',
    description: '10 contoh soal JFT-Basic bagian Menyimak dengan audio, teks percakapan, jawaban, dan pembahasan Bahasa Indonesia. Putar audionya langsung di halaman ini.',
    lead: 'Bagian Menyimak (聴解) menguji apakah Anda dapat menangkap isi percakapan dan pengumuman pendek. Berikut 10 contoh soal dengan audio. Dengarkan dulu, pilih jawaban, lalu buka pembahasannya.',
    tips: [
      'Baca pertanyaan dan pilihan jawaban sebelum memutar audio.',
      'Di ujian asli, audio dapat diputar paling banyak 2 kali. Biasakan berlatih dengan aturan yang sama.',
      'Perhatikan angka, waktu, dan tempat. Bagian ini sering ditanyakan.',
    ],
    summaryJa: '「聴解」の見本 10 問。音声、文字起こし、答えと解説つき。',
  },
  {
    key: 'reading',
    slug: 'contoh-soal-jft-basic-membaca',
    name: 'Membaca',
    ja: '読解',
    title: 'Contoh Soal JFT-Basic: Membaca (10 Soal dan Pembahasan)',
    description: '10 contoh soal JFT-Basic bagian Membaca: pesan singkat, pengumuman, dan jadwal dalam bahasa Jepang. Lengkap dengan jawaban dan pembahasan Bahasa Indonesia.',
    lead: 'Bagian Membaca (読解) menguji apakah Anda dapat memahami teks pendek seperti pesan, pengumuman, dan jadwal. Berikut 10 contoh soal dengan jawaban dan pembahasan.',
    tips: [
      'Baca pertanyaannya dulu, lalu cari jawabannya di dalam teks.',
      'Untuk pengumuman dan jadwal, cari kata kunci seperti hari, jam, dan tempat.',
      'Perhatikan kata seperti きょう (hari ini) dan あした (besok). Jawaban sering bergantung pada kata ini.',
    ],
    summaryJa: '「読解」の見本 10 問(メッセージ、お知らせ、予定表)。答えと解説つき。',
  },
];

/** 日本語の文をページ用に整える(下線の __…__ と改行) */
const ja = (text) => esc(text).replace(/__(.+?)__/g, '<u>$1</u>').replaceAll('\n', '<br>');

function loadQuestions() {
  const questions = new Map();
  const translations = new Map();
  for (const file of readdirSync(join(CONTENT, 'questions')).filter((n) => n.endsWith('.json'))) {
    for (const q of readJson(join(CONTENT, 'questions', file))) questions.set(q.id, q);
  }
  for (const file of readdirSync(join(CONTENT, 'translations', 'id')).filter((n) => n.endsWith('.json'))) {
    for (const t of readJson(join(CONTENT, 'translations', 'id', file))) translations.set(t.id, t);
  }
  return { questions, translations, sets: readJson(join(CONTENT, 'sets.json')), meta: readJson(join(CONTENT, 'meta.json')) };
}

function questionHtml(q, t, number) {
  const letters = ['A', 'B', 'C', 'D'];
  return `<section class="q">
<h2 id="soal-${number}">Soal ${number}</h2>
<p class="inst">${esc(t.instruction)}</p>
${q.passage ? `<div class="passage" lang="ja">${ja(q.passage)}</div>` : ''}
${q.audio ? `<audio controls preload="none" src="/${esc(q.audio)}"></audio>` : ''}
<p class="prompt" lang="ja">${ja(q.prompt)}</p>
<ol class="choices" type="A" lang="ja">${q.choices.map((c) => `<li>${ja(c)}</li>`).join('')}</ol>
${q.transcript ? `<details><summary>Lihat teks audio</summary><p lang="ja">${ja(q.transcript)}</p></details>` : ''}
<details><summary>Lihat jawaban dan pembahasan</summary>
<p><strong>Jawaban: ${letters[q.answerIndex]}. <span lang="ja">${ja(q.choices[q.answerIndex])}</span></strong></p>
<p>${esc(t.explanation)}</p>
</details>
</section>`;
}

function buildSamples() {
  const data = loadQuestions();
  const entries = SAMPLE_SECTIONS.map((section, index) => {
    const set = data.sets.find((s) => s.id === `${section.key}-01`);
    if (!set) fail(`見本ページ: 練習セット ${section.key}-01 が sets.json にない`);
    const items = set.questionIds.map((id, i) => {
      const q = data.questions.get(id);
      const t = data.translations.get(id);
      if (!q || !t) fail(`見本ページ: 問題 ${id} の本体か訳がない`);
      return questionHtml(q, t, i + 1);
    });
    const others = SAMPLE_SECTIONS.filter((s) => s.key !== section.key)
      .map((s) => `<li><a href="${pagePath(s.slug)}">Contoh soal ${esc(s.name)}</a></li>`)
      .join('');
    const html =
      `<p class="lead">${esc(section.lead)}</p>\n` +
      `<p class="note">Soal-soal ini dibuat oleh tim Lulus Nihongo sebagai latihan. Ini bukan soal ujian asli.</p>\n` +
      `<h2 id="saran">Saran mengerjakan</h2>\n<p class="note">Bagian ini adalah saran dari kami, bukan informasi resmi.</p>\n<ul>${section.tips.map((tip) => `<li>${esc(tip)}</li>`).join('')}</ul>\n` +
      items.slice(0, 5).join('\n') +
      `\n${MID_CTA}\n` +
      items.slice(5).join('\n') +
      (section.key === 'listening' ? `\n<p class="note">Audio: ${esc(data.meta.audioCredit)}</p>` : '') +
      `\n<h2 id="lanjut">Lanjut berlatih</h2>\n` +
      `<p>Di aplikasi Lulus Nihongo ada 50 soal untuk bagian ${esc(section.name)}, dengan penilaian otomatis dan pembahasan. Catatan belajar tersimpan di perangkat Anda. Semuanya gratis dan tanpa login.</p>\n` +
      `<ul><li><a href="/">Buka aplikasi Lulus Nihongo</a></li>${others}<li><a href="${pagePath('cara-belajar-jft-basic')}">Cara belajar untuk JFT-Basic: contoh rencana 8 minggu</a></li></ul>`;
    return {
      kind: 'sample',
      slug: section.slug,
      title: section.title,
      description: section.description,
      date: SAMPLE_DATE,
      updated: SAMPLE_UPDATED,
      order: 6 + index,
      summaryJa: section.summaryJa,
      kicker: 'Contoh soal',
      crumbs: [HOME, GUIDE, { name: 'Contoh soal', path: pagePath(HUB_SLUG) }, { name: section.name, path: pagePath(section.slug) }],
      html,
    };
  });

  const hubCards = SAMPLE_SECTIONS.map(
    (s) => `<a class="card" href="${pagePath(s.slug)}"><h3>${esc(s.name)} <span lang="ja">(${esc(s.ja)})</span></h3><p>${esc(s.description)}</p></a>`,
  ).join('\n');
  const hub = {
    kind: 'sample',
    slug: HUB_SLUG,
    title: 'Contoh Soal JFT-Basic dan Pembahasan (40 Soal Gratis)',
    description: '40 contoh soal JFT-Basic untuk 4 bagian ujian: Aksara dan Kosakata, Percakapan dan Ungkapan, Menyimak (dengan audio), dan Membaca. Gratis, dengan pembahasan.',
    date: SAMPLE_DATE,
    updated: SAMPLE_UPDATED,
    order: 5,
    summaryJa: '問題の見本の入口。4 セクション × 10 問の見本ページへの案内と、問題の作り方の説明。',
    kicker: 'Contoh soal',
    crumbs: [HOME, GUIDE, { name: 'Contoh soal', path: pagePath(HUB_SLUG) }],
    html:
      `<p class="lead">Ingin tahu seperti apa soal JFT-Basic? Di halaman ini ada 40 contoh soal untuk keempat bagian ujian, masing-masing 10 soal, lengkap dengan jawaban dan pembahasan dalam Bahasa Indonesia.</p>\n` +
      `<h2 id="pilih-bagian">Pilih bagian</h2>\n${hubCards}\n` +
      `<h2 id="tentang-soal">Tentang soal ini</h2>\n` +
      `<ul><li>Semua soal dibuat oleh tim Lulus Nihongo sebagai latihan. <strong>Ini bukan soal ujian asli.</strong></li>` +
      `<li>Bentuk soal dibuat menyerupai ujian: pilihan ganda, dalam empat bagian.</li>` +
      `<li>Setiap soal memiliki pembahasan dalam Bahasa Indonesia. Soal Menyimak dilengkapi audio dan teks percakapan.</li></ul>\n` +
      `<h2 id="lanjut">Setelah mencoba contoh soal</h2>\n` +
      `<ul><li>Kerjakan 200 soal latihan dan 1 simulasi ujian 60 menit di <a href="/">aplikasi Lulus Nihongo</a>.</li>` +
      `<li>Pelajari bentuk ujiannya: <a href="${pagePath('apa-itu-jft-basic')}">Apa itu JFT-Basic?</a></li>` +
      `<li>Buat rencana belajar: <a href="${pagePath('cara-belajar-jft-basic')}">Cara belajar untuk JFT-Basic</a></li></ul>`,
  };
  return [hub, ...entries];
}

// ---- 記事と、運営者の説明などのページ ----

function fromMarkdown(dir, file, kind) {
  const { slug, meta, body } = parse(dir, file);
  const tabled = marked.parse(body).replaceAll('<table>', '<div class="table-wrap"><table>').replaceAll('</table>', '</table></div>');
  const { html: withAds, hasAds } = markAds(tabled, file);
  const { html: withIds, toc } = addHeadingIds(withAds);
  const html = kind === 'article' ? insertMidCta(insertToc(withIds, toc)) : withIds;
  return {
    kind,
    slug,
    title: meta.title,
    description: meta.description,
    date: meta.date,
    updated: meta.updated,
    order: Number(meta.order),
    summaryJa: meta.summaryJa,
    kicker: kind === 'article' ? 'Panduan' : 'Tentang kami',
    crumbs: [HOME, GUIDE, { name: meta.title, path: pagePath(slug) }],
    html: (hasAds ? `${AD_NOTE}\n` : '') + html,
  };
}

const listMd = (dir) => (existsSync(dir) ? readdirSync(dir).filter((name) => name.endsWith('.md')) : []);

const articles = listMd(ARTICLES).map((file) => fromMarkdown(ARTICLES, file, 'article')).sort((a, b) => a.order - b.order);
if (articles.length === 0) fail('site/articles/ に記事がない');
const samples = buildSamples();
const extraPages = listMd(PAGES).map((file) => fromMarkdown(PAGES, file, 'page'));
for (const entry of samples) checkMeta(entry, `見本ページ ${entry.slug}`);

const listed = [...articles, ...samples].sort((a, b) => a.order - b.order); // 一覧と「関連」に出すページ
const all = [...listed, ...extraPages];
const slugs = new Set();
for (const entry of all) {
  if (slugs.has(entry.slug)) fail(`スラッグが重なっている: ${entry.slug}`);
  slugs.add(entry.slug);
}

/** このページの次から順に、ほかのページを 3 件選ぶ */
function relatedCards(entry) {
  const index = listed.findIndex((e) => e.slug === entry.slug);
  const rotated = index < 0 ? listed : [...listed.slice(index + 1), ...listed.slice(0, index)];
  // 見本の入口は、どのページからも行けるようにする
  const hub = listed.find((e) => e.slug === HUB_SLUG);
  const picks = [];
  if (hub && entry.slug !== HUB_SLUG && entry.kind !== 'sample') picks.push(hub);
  for (const e of rotated) {
    if (picks.length >= 3) break;
    if (!picks.includes(e)) picks.push(e);
  }
  return (
    `<h2 id="baca-juga">Baca juga</h2>\n` +
    picks.map((e) => `<a class="card" href="${pagePath(e.slug)}"><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></a>`).join('\n')
  );
}

for (const entry of all) {
  const image = ogImage(entry.slug, entry.title, entry.kicker);
  const crumb = crumbs(entry.crumbs);
  const body =
    `${crumb.html}\n<article>\n<h1>${esc(entry.title)}</h1>\n` +
    `<p class="meta">Diperbarui: ${dateId(entry.updated)} · Terbit: ${dateId(entry.date)}</p>\n` +
    `${entry.html}\n</article>\n${CTA}\n${relatedCards(entry)}\n` +
    `<p><a href="/${SECTION}/">‹ Semua panduan</a></p>`;
  write(
    join(SECTION, entry.slug, 'index.html'),
    page({
      title: entry.title,
      description: entry.description,
      url: pageUrl(entry.slug),
      type: 'article',
      body,
      image,
      jsonLd: [articleJsonLd(entry, image), crumb.jsonLd],
    }),
  );
}

// ---- 一覧のページ ----

const defaultImage = ogImage('default', 'Latihan Soal JFT-Basic Gratis dengan Pembahasan Bahasa Indonesia', 'Aplikasi');
const indexUrl = `${SITE_URL}/${SECTION}/`;
const card = (e) => `<a class="card" href="${pagePath(e.slug)}"><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p></a>`;
const indexCrumb = crumbs([HOME, GUIDE]);
write(
  join(SECTION, 'index.html'),
  page({
    title: 'Panduan JFT-Basic dan Kerja di Jepang',
    description: 'Contoh soal JFT-Basic dengan pembahasan, penjelasan ujian, cara belajar, serta gaji dan biaya hidup di Jepang. Berbahasa Indonesia, berdasarkan sumber resmi.',
    url: indexUrl,
    type: 'website',
    image: ogImage('panduan', 'Panduan JFT-Basic dan Kerja di Jepang', 'Panduan'),
    jsonLd: [
      indexCrumb.jsonLd,
      {
        '@context': 'https://schema.org',
        '@type': 'ItemList',
        itemListElement: listed.map((e, i) => ({ '@type': 'ListItem', position: i + 1, url: pageUrl(e.slug), name: e.title })),
      },
    ],
    body:
      `${indexCrumb.html}\n<h1>Panduan</h1>\n<p class="lead">Contoh soal JFT-Basic, penjelasan ujian, cara belajar, dan persiapan kerja di Jepang. Setiap artikel mencantumkan sumber resmi dan tanggal pembaruan.</p>\n` +
      `<h2 id="contoh-soal">Contoh soal</h2>\n${samples.map(card).join('\n')}\n` +
      `<h2 id="artikel">Artikel</h2>\n${articles.map(card).join('\n')}\n${CTA}`,
  }),
);

// ---- 404 のページ ----
// これがあると、存在しないアドレスに Cloudflare Pages が 404 を返す(ないと、アプリの画面を 200 で返してしまう)。

write(
  '404.html',
  page({
    title: 'Halaman tidak ditemukan',
    description: 'Halaman yang Anda cari tidak ada. Buka aplikasi Lulus Nihongo atau lihat panduan JFT-Basic.',
    url: '',
    type: 'website',
    image: defaultImage,
    robots: 'noindex',
    body:
      `<h1>Halaman tidak ditemukan</h1>\n<p class="lead">Alamat ini tidak ada atau sudah dipindahkan.</p>\n` +
      `<ul><li><a href="/">Buka aplikasi Lulus Nihongo</a></li><li><a href="${pagePath(HUB_SLUG)}">Contoh soal JFT-Basic</a></li><li><a href="/${SECTION}/">Semua panduan</a></li></ul>\n${CTA}`,
  }),
);

// ---- サイトマップと robots.txt ----

const latest = all.map((e) => e.updated).sort().at(-1);
const urls = [
  { loc: `${SITE_URL}/`, lastmod: latest },
  { loc: indexUrl, lastmod: latest },
  ...all.map((e) => ({ loc: pageUrl(e.slug), lastmod: e.updated })),
];
write(
  'sitemap.xml',
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    urls.map((u) => `  <url><loc>${esc(u.loc)}</loc><lastmod>${u.lastmod}</lastmod></url>`).join('\n') +
    `\n</urlset>\n`,
);
write('robots.txt', `User-agent: *\nAllow: /\n\nSitemap: ${SITE_URL}/sitemap.xml\n`);

console.log(`記事 ${articles.length} 本、見本ページ ${samples.length} 枚、その他 ${extraPages.length} 枚を作成(サイトマップ ${urls.length} 件)`);
