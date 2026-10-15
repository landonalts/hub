// sprite-based thumbnails (./thumbs/s<N>.jpg) with procedural fallback
const THUMB_W = 160, THUMB_H = 100, THUMB_COLS = 4, THUMB_PER = 16;
const SHEET_W = 640, SHEET_H = 400;

function thumbDiv(g) {
  const d = document.createElement('div');
  d.className = 'thumb';
  if (g.t !== undefined && g.t !== null) {
    const s = Math.floor(g.t / THUMB_PER), p = g.t % THUMB_PER;
    const x = (p % THUMB_COLS) * THUMB_W, y = Math.floor(p / THUMB_COLS) * THUMB_H;
    d.style.backgroundImage = `url('./thumbs/s${s}.jpg')`;
    d.style.backgroundPosition = `-${x}px -${y}px`;
  } else {
    d.style.backgroundImage = `url('${gameTile(g.id, g.title)}')`;
    d.style.backgroundPosition = '0 0';
    d.style.backgroundSize = 'cover';
  }
  return d;
}

/* procedural fallback tile (also used pre-sprite) */
function hashStr(s) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return h >>> 0;
}
function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
const tileCache = new Map();
function gameTile(id, title) {
  if (tileCache.has(id)) return tileCache.get(id);
  const S = 168;
  const rand = mulberry32(hashStr(id));
  const c = document.createElement('canvas');
  c.width = c.height = S;
  const x = c.getContext('2d');
  x.fillStyle = '#0b0b0b'; x.fillRect(0, 0, S, S);
  const n = 7, s = S / n;
  x.fillStyle = '#1c1c1c';
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < Math.ceil(n / 2); j++) {
      if (rand() > 0.52) {
        const r = 1.5 + rand() * 3.5;
        x.beginPath(); x.arc(j * s + s / 2, i * s + s / 2, r, 0, 7); x.fill();
        x.beginPath(); x.arc((n - 1 - j) * s + s / 2, i * s + s / 2, r, 0, 7); x.fill();
      }
    }
  }
  const tone = 70 + Math.floor(rand() * 110);
  x.fillStyle = `rgb(${tone},${tone},${tone})`;
  const bw = 3 + rand() * 5;
  if (rand() > 0.5) x.fillRect(rand() * S, 0, bw, S);
  else x.fillRect(0, rand() * S, S, bw);
  const ch = (title || '?').trim().charAt(0).toUpperCase() || '?';
  x.fillStyle = '#f2f2f2';
  x.font = `600 ${Math.floor(S * 0.42)}px -apple-system, 'Segoe UI', sans-serif`;
  x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(ch, S / 2, S / 2 + S * 0.03);
  const url = c.toDataURL('image/png');
  tileCache.set(id, url);
  return url;
}
// legacy name used by older pages
const gameThumb = gameTile;
