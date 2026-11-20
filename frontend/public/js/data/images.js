// Centralized imagery mapping.
//
// Products use `imageUrl` from the API (plus optional [images: …] tags). When a product
// has no image — or it fails to load — an art-directed generated poster is used instead.
//
// Campaign photography: drop your own files into public/assets/campaign/ and point
// the entries below at them, e.g.  hero: '/assets/campaign/hero.jpg'
// (null = use the generated artwork).
export const CAMPAIGN = {
  hero: null,
  men: null,
  women: null,
  editorial: null,
  offers: null,
  categories: {          // 'Outerwear': '/assets/campaign/outerwear.jpg', …
    Outerwear: null, Knitwear: null, Tops: null, Bottoms: null, Dresses: null, Footwear: null, Accessories: null
  }
};

const GLYPHS = {
  Tops: 'M60 40 85 30Q100 46 115 30L140 40 170 72 148 92 138 82V166H62V82L52 92 30 72Z',
  Knitwear: 'M66 40Q100 20 134 40L176 122 152 132 138 98V168H62V98L48 132 24 122ZM78 138h44l6 22H72ZM80 38Q100 66 120 38',
  Outerwear: 'M66 38Q100 22 134 38L176 124 152 134 138 100V170H62V100L48 134 24 124ZM100 44V170M80 36l20 22 20-22',
  Bottoms: 'M62 28H138L150 172H112L100 84 88 172H50Z',
  Dresses: 'M82 28 100 46 118 28 132 70 120 92 154 174H46L80 92 68 70Z',
  Footwear: 'M26 124Q26 104 52 100L78 70 100 92 150 100Q178 110 178 132V142H26Z',
  Accessories: 'M64 74h72l10 98H54ZM82 74V62Q100 36 118 62V74',
  Essentials: 'M100 28 150 56V120L100 148 50 120V56Z'
};

function hash(s) {
  let x = 2166136261;
  for (let i = 0; i < s.length; i++) { x ^= s.charCodeAt(i); x = Math.imul(x, 16777619); }
  return Math.abs(x);
}

const uri = (svg) => `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;

const xml = (s) => String(s ?? '').replace(/[&<>]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));

function art({ w, h, seed, glyph, label, big = '' }) {
  label = xml(label); big = xml(big);
  const n = hash(seed);
  const hue = 262 + (n % 28) - 10;                 // violet range
  const tilt = -18 + (n % 14);
  const gx = 20 + (n % 55);
  const g = glyph ? (GLYPHS[glyph] || GLYPHS.Essentials) : null;
  const s = Math.min(w, h) / 200 * 0.62;
  const gxPos = w / 2 - 100 * s, gyPos = h * 0.52 - 100 * s;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice">
<defs>
<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0b0a10"/><stop offset=".55" stop-color="hsl(${hue} 55% 9%)"/><stop offset="1" stop-color="#050507"/></linearGradient>
<linearGradient id="st" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="hsl(${hue} 90% 62%)" stop-opacity="0"/><stop offset=".5" stop-color="hsl(${hue} 90% 66%)" stop-opacity=".55"/><stop offset="1" stop-color="hsl(${hue} 90% 62%)" stop-opacity="0"/></linearGradient>
<linearGradient id="ln" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e9e3ff"/><stop offset="1" stop-color="hsl(${hue} 85% 62%)"/></linearGradient>
<filter id="bl"><feGaussianBlur stdDeviation="${Math.round(Math.min(w, h) / 38)}"/></filter>
<filter id="gr"><feTurbulence type="fractalNoise" baseFrequency=".9" numOctaves="2" seed="${n % 90}"/><feColorMatrix values="0 0 0 0 1  0 0 0 0 1  0 0 0 0 1  0 0 0 .5 0"/></filter>
</defs>
<rect width="${w}" height="${h}" fill="url(#bg)"/>
<g transform="rotate(${tilt} ${w / 2} ${h / 2})" filter="url(#bl)"><rect x="${w * (gx / 100) - w * .09}" y="${-h * .3}" width="${w * .18}" height="${h * 1.6}" fill="url(#st)"/></g>
${big ? `<text x="${w * .06}" y="${h * .9}" font-family="Archivo,Arial Black,sans-serif" font-weight="900" font-size="${h * .5}" fill="none" stroke="hsl(${hue} 60% 70%)" stroke-opacity=".24" stroke-width="${Math.max(1, h / 500)}" letter-spacing="-${h * .02}">${big}</text>` : ''}
${g ? `<g transform="translate(${gxPos} ${gyPos}) scale(${s})" fill="hsl(${hue} 50% 12% / .55)" stroke="url(#ln)" stroke-width="1.7" stroke-linejoin="round" stroke-linecap="round"><path d="${g}"/></g>` : ''}
<rect width="${w}" height="${h}" filter="url(#gr)" opacity=".08"/>
<rect x="${w * .035}" y="${w * .035}" width="${w * .93}" height="${h - w * .07}" fill="none" stroke="#fff" stroke-opacity=".07"/>
${label ? `<text x="${w * .07}" y="${h * .075}" font-family="Inter,Arial,sans-serif" font-size="${Math.max(9, w * .02)}" letter-spacing="${w * .006}" fill="#fff" fill-opacity=".45">${label}</text>` : ''}
</svg>`;
}

/** Generated fallback poster for a product (3:4). */
export function productFallback(p) {
  return uri(art({ w: 600, h: 800, seed: `${p.id}-${p.name}`, glyph: p.category, label: `M.E · ${String(p.category || 'Essentials').toUpperCase()}` }));
}

/** All gallery images for a product: real ones first, generated poster as the last resort. */
export function productImages(p) {
  return p.images?.length ? p.images : [productFallback(p)];
}

/** Campaign imagery: returns { src, fallback }. */
export function campaign(key, { w = 1600, h = 900, big = '', glyph = 'Essentials', label = '' } = {}) {
  const custom = key.startsWith('cat:') ? CAMPAIGN.categories[key.slice(4)] : CAMPAIGN[key];
  const fallback = uri(art({ w, h, seed: key, glyph, label, big }));
  return { src: custom || fallback, fallback };
}

/** <img> markup with automatic fallback to generated art if the source fails. */
export function img({ src, fallback, alt = '', cls = '', loading = 'lazy', w, h }) {
  const fb = fallback ? ` data-fallback="${fallback.replace(/"/g, '&quot;')}"` : '';
  return `<img class="${cls}" src="${src.replace(/"/g, '&quot;')}"${fb} alt="${alt.replace(/"/g, '&quot;')}" loading="${loading}" decoding="async"${w ? ` width="${w}" height="${h}"` : ''}>`;
}
