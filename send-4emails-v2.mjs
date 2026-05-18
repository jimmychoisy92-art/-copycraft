/**
 * send-4emails-v2.mjs
 * 4 emails de test avec VRAIS visuels :
 *  - Screenshot Google Maps (coiffeurs paris) pour Email 1 (GMB absent)
 *  - 3 vrais mockups site HTML inline + screenshot Puppeteer pour Email 2
 *  - Photos food + mock Instagram pour Email 3 & 4
 *  - Toutes images embarquées en base64 (aucune dépendance réseau externe)
 */

import puppeteer from 'puppeteer';
import nodemailer from 'nodemailer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);

const TMP_DIR = path.join(__dirname, 'tmp_emails');
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: 'pompiers94Creteil.' },
});

const FROM = '"TheCopyCraft" <contact@thecopycraft.fr>';
const TO = 'contact@thecopycraft.fr';

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Download image ────────────────────────────────────────────────────────────
async function downloadImage(url, filename) {
  const dest = path.join(TMP_DIR, filename);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 5000) {
    console.log(`  ♻️  ${filename} (cache)`);
    return dest;
  }
  await execAsync(`curl -sL --max-time 20 -A "Mozilla/5.0" -o "${dest}" "${url}"`);
  const size = fs.existsSync(dest) ? fs.statSync(dest).size : 0;
  console.log(`  ⬇️  ${filename} → ${Math.round(size/1024)}KB`);
  return dest;
}

// ── Image en base64 data URI ──────────────────────────────────────────────────
function toDataURI(filePath, mime = 'image/jpeg') {
  if (!fs.existsSync(filePath)) return '';
  return `data:${mime};base64,${fs.readFileSync(filePath).toString('base64')}`;
}

// ── Puppeteer screenshot ──────────────────────────────────────────────────────
async function screenshotUrl(browser, url, filename, width = 1000, height = 600, waitMs = 4000) {
  const dest = path.join(TMP_DIR, filename);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height, deviceScaleFactor: 1 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await sleep(waitMs);
    await page.screenshot({ path: dest, type: 'jpeg', quality: 82, clip: { x: 0, y: 0, width, height } });
  } catch (e) {
    console.log(`  ⚠️ screenshot ${filename}: ${e.message.slice(0, 60)}`);
  } finally {
    await page.close();
  }
  return dest;
}

async function screenshotHtml(browser, html, filename, width = 1200, clipHeight = 520) {
  const dest = path.join(TMP_DIR, filename);
  const page = await browser.newPage();
  try {
    await page.setViewport({ width, height: 900, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'domcontentloaded' });
    await sleep(1500);
    await page.screenshot({ path: dest, type: 'jpeg', quality: 88, clip: { x: 0, y: 0, width, height: clipHeight } });
  } catch (e) {
    console.log(`  ⚠️ screenshotHtml ${filename}: ${e.message.slice(0, 60)}`);
  } finally {
    await page.close();
  }
  return dest;
}

// ── MOCKUPS HTML (templates inline, photo salon en base64) ────────────────────
function buildMockupDark(heroB64) {
  const heroSrc = heroB64 || 'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=85';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#0a0a0a;font-family:Georgia,serif;}
    nav{background:#0a0a0a;padding:18px 40px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #222;}
    .logo{font-size:18px;font-weight:700;letter-spacing:5px;color:#c9a96e;text-transform:uppercase;}
    .nav-links{display:flex;gap:30px;}
    .nav-links a{color:#777;text-decoration:none;font-size:12px;letter-spacing:2px;text-transform:uppercase;}
    .hero{position:relative;height:380px;overflow:hidden;}
    .hero img{width:100%;height:380px;object-fit:cover;opacity:0.45;display:block;}
    .hero-txt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:30px;}
    .hero-txt h1{font-size:40px;font-weight:400;letter-spacing:6px;color:#fff;text-transform:uppercase;margin-bottom:12px;}
    .hero-txt p{font-size:14px;color:#c9a96e;letter-spacing:3px;text-transform:uppercase;margin-bottom:24px;}
    .btn-g{border:1px solid #c9a96e;color:#c9a96e;padding:12px 36px;font-size:11px;letter-spacing:3px;text-transform:uppercase;text-decoration:none;display:inline-block;}
    .services{padding:60px 40px;display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:1px;background:#1a1a1a;}
    .svc{background:#0a0a0a;padding:32px 20px;text-align:center;}
    .svc h3{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:8px;}
    .svc .price{font-size:28px;color:#fff;margin-bottom:6px;}
    .svc p{font-size:12px;color:#555;line-height:1.7;}
    .review{background:#111;padding:40px;text-align:center;}
    .stars{font-size:20px;color:#c9a96e;margin-bottom:8px;}
    .review h2{font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:16px;}
    .review-num{font-size:48px;font-weight:700;color:#fff;line-height:1;}
    .review-sub{font-size:12px;color:#555;margin-top:6px;}
    footer{background:#000;padding:22px 40px;text-align:center;font-size:11px;color:#333;letter-spacing:2px;}
  </style></head><body>
    <nav><div class="logo">Fadiman Coiffure</div><div class="nav-links"><a href="#">Services</a><a href="#">Galerie</a><a href="#">Réserver</a></div></nav>
    <div class="hero"><img src="${heroSrc}" alt="salon" /><div class="hero-txt"><h1>Fadiman Coiffure</h1><p>Salon de coiffure · Paris 11ème</p><a href="#" class="btn-g">Prendre rendez-vous</a></div></div>
    <div class="services">
      <div class="svc"><h3>Coupe Femme</h3><div class="price">45€</div><p>Shampoing, coupe<br>brushing sur mesure</p></div>
      <div class="svc"><h3>Coupe Homme</h3><div class="price">25€</div><p>Coupe précise<br>finitions soignées</p></div>
      <div class="svc"><h3>Coloration</h3><div class="price">80€</div><p>Couleur pleine tête<br>ou mèches</p></div>
      <div class="svc"><h3>Balayage</h3><div class="price">120€</div><p>Balayage californien<br>naturel et lumineux</p></div>
    </div>
    <div class="review"><h2>Avis clients vérifiés</h2><div class="stars">★★★★★</div><div class="review-num">199</div><div class="review-sub">avis · Note 5,0 / 5 sur Google</div></div>
    <footer>FADIMAN COIFFURE · 42 rue de la Roquette, Paris 11ème · 01 23 45 67 89</footer>
  </body></html>`;
}

function buildMockupWarm(heroB64) {
  const heroSrc = heroB64 || 'https://images.unsplash.com/photo-1595476108010-b4d1f102b1b1?w=1200&q=85';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#f8f4ef;font-family:Georgia,serif;color:#3d2b1f;}
    nav{background:#fff;padding:18px 40px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e8ddd5;}
    .logo{font-size:20px;font-weight:700;color:#b8955c;letter-spacing:2px;}
    .nav-btn{background:#c17d4b;color:#fff;padding:10px 22px;font-size:13px;text-decoration:none;}
    .hero{position:relative;height:400px;overflow:hidden;}
    .hero img{width:100%;height:400px;object-fit:cover;display:block;}
    .hero-ov{position:absolute;inset:0;background:rgba(61,43,31,0.52);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;}
    .hero-ov h1{font-size:42px;color:#f5e8d5;letter-spacing:2px;margin-bottom:10px;}
    .hero-ov p{font-size:16px;color:#d4af7a;font-style:italic;margin-bottom:26px;}
    .btn-w{background:#c17d4b;color:#fff;padding:12px 32px;font-size:13px;text-decoration:none;display:inline-block;}
    .services{padding:60px 40px;background:#fff;text-align:center;}
    .services h2{font-size:26px;color:#b8955c;letter-spacing:2px;margin-bottom:40px;}
    .grid{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:20px;}
    .card{border:1px solid #e8ddd5;padding:28px 16px;text-align:center;}
    .card .icon{font-size:26px;margin-bottom:12px;}
    .card h3{font-size:13px;color:#b8955c;letter-spacing:1px;margin-bottom:6px;}
    .card .price{font-size:24px;font-weight:700;color:#3d2b1f;}
    .avis{background:#3d2b1f;padding:50px 40px;text-align:center;}
    .stars{color:#d4af7a;font-size:20px;margin-bottom:10px;}
    .avis blockquote{font-size:16px;color:#f5e8d5;font-style:italic;max-width:550px;margin:0 auto 14px;}
    .avis cite{font-size:13px;color:#9a8070;}
    footer{background:#2a1e14;padding:24px;text-align:center;font-size:11px;color:#7a6050;letter-spacing:1px;}
  </style></head><body>
    <nav><div class="logo">Fadiman Coiffure</div><a href="#" class="nav-btn">Réserver</a></nav>
    <div class="hero"><img src="${heroSrc}" alt="salon"/><div class="hero-ov"><h1>Fadiman Coiffure</h1><p>Révélez votre beauté naturelle</p><a href="#" class="btn-w">Prendre rendez-vous</a></div></div>
    <div class="services">
      <h2>Nos prestations</h2>
      <div class="grid">
        <div class="card"><div class="icon">✂️</div><h3>Coupe Femme</h3><div class="price">45€</div></div>
        <div class="card"><div class="icon">💈</div><h3>Coupe Homme</h3><div class="price">25€</div></div>
        <div class="card"><div class="icon">🎨</div><h3>Coloration</h3><div class="price">80€</div></div>
        <div class="card"><div class="icon">✨</div><h3>Balayage</h3><div class="price">120€</div></div>
      </div>
    </div>
    <div class="avis"><div class="stars">★★★★★</div><blockquote>"Vraiment un salon d'exception. L'accueil, le soin du détail... je ne vais plus nulle part ailleurs."</blockquote><cite>Sophie M. · 199 avis 5 étoiles sur Google</cite></div>
    <footer>FADIMAN COIFFURE · Paris 11ème · 01 23 45 67 89</footer>
  </body></html>`;
}

function buildMockupModern(heroB64) {
  const heroSrc = heroB64 || 'https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=800&q=85';
  return `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#fff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;}
    nav{background:#fff;padding:16px 40px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a4a3a;}
    .logo{font-size:18px;font-weight:900;color:#1a4a3a;letter-spacing:1px;}
    .nav-links{display:flex;gap:24px;align-items:center;}
    .nav-links a{color:#555;text-decoration:none;font-size:13px;}
    .btn-g{background:#1a4a3a;color:#fff;padding:10px 22px;font-size:13px;font-weight:700;text-decoration:none;}
    .hero{display:flex;height:460px;}
    .hero-img{flex:1;overflow:hidden;}
    .hero-img img{width:100%;height:460px;object-fit:cover;display:block;}
    .hero-txt{flex:1;background:#f0f8f4;display:flex;flex-direction:column;justify-content:center;padding:50px 44px;}
    .tag{font-size:10px;color:#1a4a3a;text-transform:uppercase;letter-spacing:3px;font-weight:700;margin-bottom:14px;}
    .hero-txt h1{font-size:36px;font-weight:900;color:#1a1a1a;line-height:1.2;margin-bottom:16px;}
    .hero-txt p{font-size:14px;color:#666;line-height:1.8;margin-bottom:28px;}
    .btn-main{background:#1a4a3a;color:#fff;padding:13px 28px;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;}
    .services{padding:70px 40px;background:#fff;}
    .services h2{font-size:28px;font-weight:900;margin-bottom:8px;}
    .services .sub{font-size:14px;color:#888;margin-bottom:40px;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
    .card{border:1px solid #e8e8e8;padding:28px 22px;}
    .card .num{font-size:11px;color:#1a4a3a;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;}
    .card h3{font-size:16px;font-weight:800;margin-bottom:6px;}
    .card .price{font-size:20px;font-weight:700;color:#1a4a3a;margin-bottom:6px;}
    .card p{font-size:12px;color:#888;line-height:1.7;}
    .reviews{background:#f0f8f4;padding:50px 40px;display:flex;align-items:center;gap:60px;}
    .rev-big{font-size:64px;font-weight:900;color:#1a4a3a;line-height:1;}
    .rev-sub{font-size:13px;color:#888;margin-top:6px;}
    .stars{color:#f59e0b;font-size:18px;margin-top:8px;}
    .rev-text{font-size:16px;font-style:italic;color:#333;line-height:1.7;max-width:480px;}
    footer{background:#1a4a3a;color:#fff;padding:26px 40px;display:flex;justify-content:space-between;font-size:12px;}
  </style></head><body>
    <nav>
      <div class="logo">Fadiman Coiffure</div>
      <div class="nav-links"><a href="#">Services</a><a href="#">Avis</a><a href="#">Contact</a><a href="#" class="btn-g">Réserver →</a></div>
    </nav>
    <div class="hero">
      <div class="hero-img"><img src="${heroSrc}" alt="salon"/></div>
      <div class="hero-txt">
        <div class="tag">Paris 11ème · Depuis 2015</div>
        <h1>Votre coiffeur<br>de confiance</h1>
        <p>199 avis 5 étoiles. Coupes, colorations, balayages — par des coiffeurs passionnés, dans un cadre chaleureux.</p>
        <a href="#" class="btn-main">Prendre rendez-vous →</a>
      </div>
    </div>
    <div class="services">
      <h2>Nos prestations</h2><div class="sub">Des services sur mesure pour tous les types de cheveux</div>
      <div class="grid">
        <div class="card"><div class="num">01</div><h3>Coupe Femme</h3><div class="price">45€</div><p>Shampoing, coupe, brushing — adapté à votre morphologie.</p></div>
        <div class="card"><div class="num">02</div><h3>Coupe Homme</h3><div class="price">25€</div><p>Coupe précise, finitions soignées, résultat net.</p></div>
        <div class="card"><div class="num">03</div><h3>Coloration</h3><div class="price">80€</div><p>Couleur pleine tête ou mèches, produits respectueux.</p></div>
        <div class="card"><div class="num">04</div><h3>Balayage</h3><div class="price">120€</div><p>Balayage californien pour un effet naturel et solaire.</p></div>
        <div class="card"><div class="num">05</div><h3>Soin kératine</h3><div class="price">90€</div><p>Lissage et réparation en profondeur.</p></div>
        <div class="card"><div class="num">06</div><h3>Brushing</h3><div class="price">30€</div><p>Mise en forme parfaite, résultat professionnel.</p></div>
      </div>
    </div>
    <div class="reviews">
      <div><div class="rev-big">199</div><div class="stars">★★★★★</div><div class="rev-sub">avis · Note 5,0/5 sur Google</div></div>
      <div class="rev-text">"Vraiment le meilleur salon du 11ème. Accueil au top, résultat impeccable à chaque fois. Je ne vais plus nulle part ailleurs."<br><strong style="font-size:13px;color:#1a4a3a;font-style:normal;display:block;margin-top:10px;">— Marie L. · Cliente depuis 3 ans</strong></div>
    </div>
    <footer><span>© 2025 Fadiman Coiffure</span><span>Paris 11ème · 01 23 45 67 89</span></footer>
  </body></html>`;
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────────────────────
console.log('🚀 Démarrage — génération des visuels...\n');

const browser = await puppeteer.launch({
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-web-security'],
});

// ── 1. Télécharger images hero ────────────────────────────────────────────────
console.log('⬇️  Téléchargement des images...');
const imgs = {
  salon: await downloadImage('https://images.unsplash.com/photo-1560066984-138dadb4c035?w=600&q=82', 'hero_salon.jpg'),
  food:  await downloadImage('https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=600&q=82', 'hero_food.jpg'),
  food2: await downloadImage('https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?w=600&q=82', 'hero_food2.jpg'),
  insta: await downloadImage('https://images.unsplash.com/photo-1476224203421-9ac39bcb3327?w=400&q=82', 'hero_insta.jpg'),
  influencer: await downloadImage('https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?w=600&q=82', 'hero_influencer.jpg'),
  salon2: await downloadImage('https://images.unsplash.com/photo-1521590832167-7bcbfaa6381f?w=600&q=82', 'hero_salon2.jpg'),
};
console.log('');

// ── 2. Screenshot Google Maps ─────────────────────────────────────────────────
console.log('📍 Screenshot Google Maps — résultats salons coiffure...');
const gmbPath = await screenshotUrl(
  browser,
  'https://www.google.com/maps/search/coiffeur+paris+11?hl=fr',
  'gmb_search.jpg', 900, 580, 5000
);
const gmbB64 = fs.existsSync(gmbPath) && fs.statSync(gmbPath).size > 5000
  ? toDataURI(gmbPath)
  : null;
console.log(`  ${gmbB64 ? '✅ GMB screenshot OK' : '⚠️ GMB screenshot absent'} (${gmbPath ? Math.round((fs.existsSync(gmbPath) ? fs.statSync(gmbPath).size : 0)/1024) : 0}KB)\n`);

// ── 3. Générer + screenshotter les 3 mockups ──────────────────────────────────
console.log('🎨 Génération des mockups...');
const heroBase64 = {
  dark:   fs.existsSync(imgs.salon)  ? `data:image/jpeg;base64,${fs.readFileSync(imgs.salon).toString('base64')}` : null,
  warm:   fs.existsSync(imgs.salon2) ? `data:image/jpeg;base64,${fs.readFileSync(imgs.salon2).toString('base64')}` : null,
  modern: fs.existsSync(imgs.salon)  ? `data:image/jpeg;base64,${fs.readFileSync(imgs.salon).toString('base64')}` : null,
};

const mockups = {
  dark:   { label: 'Élégant & Minimaliste', html: buildMockupDark(heroBase64.dark) },
  warm:   { label: 'Chaleureux & Premium',  html: buildMockupWarm(heroBase64.warm) },
  modern: { label: 'Moderne & Épuré',       html: buildMockupModern(heroBase64.modern) },
};

const mockupB64 = {};
for (const [style, { label, html }] of Object.entries(mockups)) {
  fs.writeFileSync(path.join(TMP_DIR, `mockup_${style}.html`), html);
  console.log(`  📸 Screenshot "${label}"...`);
  const shotPath = await screenshotHtml(browser, html, `mockup_${style}.jpg`, 1200, 520);
  const size = fs.existsSync(shotPath) ? fs.statSync(shotPath).size : 0;
  console.log(`     → ${Math.round(size/1024)}KB`);
  mockupB64[style] = size > 5000 ? toDataURI(shotPath) : null;
  mockupB64[`${style}_label`] = label;
}

await browser.close();
console.log('');

// ── Helper <img> block ────────────────────────────────────────────────────────
function imgBlock(b64path, alt, width = 600, extraStyle = '') {
  const src = fs.existsSync(b64path) ? toDataURI(b64path) : '';
  if (!src) return `<div style="background:#eee;height:200px;display:flex;align-items:center;justify-content:center;color:#999;font-size:14px;">${alt}</div>`;
  return `<img src="${src}" alt="${alt}" width="${width}" style="width:100%;display:block;${extraStyle}" />`;
}

function mockupBlock(style) {
  const b64 = mockupB64[style];
  const label = mockupB64[`${style}_label`] || style;
  const colors = { dark: '#0a0a0a', warm: '#f8f4ef', modern: '#f0f8f4' };
  const texts  = { dark: '#c9a96e', warm: '#b8955c', modern: '#1a4a3a' };

  return `
    <td style="width:32%;padding:0 4px;vertical-align:top;">
      <div style="border-radius:6px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.12);">
        <div style="background:#1a1a1a;padding:7px 10px;text-align:center;">
          <span style="font-size:10px;color:#e8944a;font-weight:700;text-transform:uppercase;letter-spacing:1px;">${label}</span>
        </div>
        ${b64
          ? `<img src="${b64}" alt="Maquette ${label}" style="width:100%;display:block;max-height:220px;object-fit:cover;object-position:top;" />`
          : `<div style="height:200px;background:${colors[style]};display:flex;align-items:center;justify-content:center;"><span style="color:${texts[style]};font-size:13px;font-weight:700;">${label}</span></div>`
        }
      </div>
    </td>`;
}

// ────────────────────────────────────────────────────────────────────────────
// EMAIL 1 — Sans fiche Google My Business
// ────────────────────────────────────────────────────────────────────────────
const email1 = {
  from: FROM, to: TO,
  subject: 'Salon Lumière — vous êtes invisible sur Google Maps',
  html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <tr><td style="padding:0;position:relative;">
    ${imgBlock(imgs.salon, 'Salon de coiffure', 600)}
    <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.82));padding:28px 24px 20px;text-align:center;">
      <p style="margin:0;color:#fff;font-size:20px;font-weight:800;line-height:1.4;">Chaque jour, des clients vous cherchent<br>et ne vous trouvent pas</p>
    </div>
  </td></tr>

  <tr><td style="background:#c0392b;padding:18px 28px;">
    <p style="margin:0;color:#fff;font-size:15px;line-height:1.7;text-align:center;">
      <strong>En ce moment, des dizaines de personnes cherchent "salon coiffure [votre ville]" sur Google.<br>Sans fiche Google My Business, vous êtes invisible.</strong>
    </p>
  </td></tr>

  <tr><td style="padding:28px 28px 16px;">
    <p style="margin:0 0 14px;font-size:15px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Voici ce que vos concurrents captent en ce moment</p>
    <p style="margin:0 0 16px;font-size:14px;color:#555;text-align:center;line-height:1.6;">Sur Google Maps, les salons avec une fiche optimisée apparaissent en premier. Sans fiche, vous n'existez pas dans ces résultats.</p>
    <div style="border:2px solid #e8944a;border-radius:8px;overflow:hidden;">
      <div style="background:#e8944a;padding:7px 14px;">
        <span style="font-size:11px;color:#fff;font-weight:700;text-transform:uppercase;letter-spacing:1px;">Résultats Google Maps — "coiffeur Paris" (capture réelle)</span>
      </div>
      ${gmbB64
        ? `<img src="${gmbB64}" alt="Google Maps coiffeurs Paris" style="width:100%;display:block;" />`
        : `<img src="${toDataURI(imgs.salon)}" alt="Exemple salon" style="width:100%;display:block;opacity:0.6;" />`
      }
    </div>
    <p style="margin:12px 0 0;font-size:13px;color:#c0392b;font-weight:700;text-align:center;">→ Sans fiche GMB, vous n'apparaissez dans aucun de ces résultats.</p>
  </td></tr>

  <tr><td style="padding:16px 28px 24px;">
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      <td style="width:33%;padding:0 6px 0 0;"><div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 12px;text-align:center;"><div style="font-size:28px;font-weight:900;color:#e8944a;">46%</div><div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;">des recherches Google ont une intention locale</div></div></td>
      <td style="width:33%;padding:0 3px;"><div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 12px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#e8944a;">+1 000</div><div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;">vues/mois avec une fiche GMB optimisée</div></div></td>
      <td style="width:33%;padding:0 0 0 6px;"><div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 12px;text-align:center;"><div style="font-size:28px;font-weight:900;color:#e8944a;">76%</div><div style="font-size:12px;color:#555;margin-top:6px;line-height:1.4;">des recherches locales = visite dans les 24h</div></div></td>
    </tr></table>
  </td></tr>

  <tr><td style="padding:0 28px 20px;"><div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;"><p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Ce qu'on fait pour vous</p><p style="margin:0;color:#fff;font-size:14px;line-height:1.8;">Création complète de votre fiche Google My Business — photos professionnelles, description optimisée, catégories, horaires, zone de service — et configuration pour apparaître dans les premières recherches locales. Livraison en 48h.</p></div></td></tr>

  <tr><td style="padding:0 28px 28px;"><div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;"><div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Offre de lancement</div><div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">150€</div><div style="font-size:14px;color:#e8944a;font-weight:700;margin-top:4px;">Création + optimisation complète — livraison en 48h</div></div></td></tr>

  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Fiche%20Google%20My%20Business&body=Bonjour%2C%0A%0AJe%20suis%20int%C3%A9ress%C3%A9%20par%20la%20cr%C3%A9ation%20de%20ma%20fiche%20Google.%0A%0AMon%20%C3%A9tablissement%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux ma fiche Google maintenant →
    </a>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;"><p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p></td></tr>
</table></td></tr></table></body></html>`,
};

// ────────────────────────────────────────────────────────────────────────────
// EMAIL 2 — Sans site web (Fadiman Coiffure) — 3 vrais mockups
// ────────────────────────────────────────────────────────────────────────────
const email2 = {
  from: FROM, to: TO,
  subject: 'Fadiman Coiffure — 199 avis 5 étoiles, mais pas de site web',
  html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <tr><td style="padding:0;">${imgBlock(imgs.salon, 'Salon luxe', 600)}</td></tr>

  <tr><td style="padding:32px 28px 20px;">
    <p style="margin:0 0 16px;font-size:22px;font-weight:900;color:#1a1a1a;line-height:1.3;">Vous avez 199 avis 5 étoiles.<br>C'est exceptionnel.</p>
    <p style="margin:0;font-size:16px;color:#444;line-height:1.7;">Mais sans site web, <strong style="color:#c0392b;">75% de vos clients potentiels passent chez un concurrent qui en a un.</strong> Votre réputation est là. Elle mérite une vitrine à la hauteur.</p>
  </td></tr>

  <tr><td style="padding:0 28px 28px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Voici à quoi pourrait ressembler votre site</p>
    <p style="margin:0 0 20px;font-size:14px;color:#666;text-align:center;line-height:1.6;">3 directions possibles — vous choisissez le style, on livre en 7 jours</p>
    <table width="100%" cellpadding="0" cellspacing="0"><tr>
      ${mockupBlock('dark')}
      ${mockupBlock('warm')}
      ${mockupBlock('modern')}
    </tr></table>
    <p style="margin:16px 0 0;font-size:12px;color:#888;text-align:center;font-style:italic;">Maquettes conçues spécifiquement pour Fadiman Coiffure — personnalisables à 100%</p>
  </td></tr>

  <tr><td style="padding:0 28px 20px;"><div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;"><p style="margin:0 0 12px;font-size:14px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Tout est inclus</p><table width="100%" cellpadding="0" cellspacing="0"><tr><td style="width:50%;vertical-align:top;"><p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Design sur mesure</p><p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Textes copywriting inclus</p></td><td style="width:50%;vertical-align:top;"><p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Formulaire de réservation</p><p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Optimisation mobile complète</p></td></tr></table></div></td></tr>

  <tr><td style="padding:0 28px 28px;"><div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;"><div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">Création site vitrine</div><div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">800€</div><div style="font-size:14px;color:#e8944a;font-weight:700;margin-top:4px;">Livré en 7 jours, clé en main</div></div></td></tr>

  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Site%20web%20Fadiman%20Coiffure&body=Bonjour%2C%0A%0AJe%20souhaite%20voir%20les%20maquettes%20pour%20mon%20site.%0A%0AMon%20salon%20%3A%20Fadiman%20Coiffure%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux voir les maquettes complètes →
    </a>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;"><p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p></td></tr>
</table></td></tr></table></body></html>`,
};

// ────────────────────────────────────────────────────────────────────────────
// EMAIL 3 — Sans réseaux sociaux (Le P'tit Bistrot)
// ────────────────────────────────────────────────────────────────────────────
const email3 = {
  from: FROM, to: TO,
  subject: "Le P'tit Bistrot — 1419 clients satisfaits, 0 présence Instagram",
  html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <tr><td style="padding:0;position:relative;">
    ${imgBlock(imgs.food, 'Restaurant gastronomique', 600)}
    <div style="position:absolute;bottom:0;left:0;right:0;background:linear-gradient(transparent,rgba(0,0,0,0.82));padding:30px 28px 24px;text-align:center;">
      <p style="margin:0;color:#fff;font-size:18px;font-weight:800;line-height:1.4;">1419 avis 4,6 étoiles.<br>Sur Instagram, vous n'existez pas.</p>
    </div>
  </td></tr>

  <tr><td style="padding:28px 28px 20px;">
    <p style="margin:0;font-size:15px;color:#444;line-height:1.8;">1419 personnes ont adoré votre restaurant. Aucune ne peut vous retrouver sur Instagram. Chaque semaine, des clients potentiels cherchent <strong>"restaurant Paris"</strong> sur Instagram — et choisissent vos concurrents qui y sont présents.</p>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Voici ce que ça donnerait sur votre compte</p>
    <div style="border:1px solid #dbdbdb;border-radius:12px;overflow:hidden;max-width:340px;margin:0 auto;background:#fff;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
      <div style="padding:10px 14px;border-bottom:1px solid #f0f0f0;">
        <table cellpadding="0" cellspacing="0"><tr>
          <td><div style="width:42px;height:42px;border-radius:50%;background:linear-gradient(135deg,#f9ce34,#ee2a7b,#6228d7);"></div></td>
          <td style="padding-left:10px;"><div style="font-size:13px;font-weight:700;color:#1a1a1a;">le_ptit_bistrot_paris4</div><div style="font-size:11px;color:#888;">Paris 4ème · Bistrot</div></td>
          <td style="padding-left:30px;"><span style="font-size:11px;color:#3b82f6;font-weight:600;">Suivre</span></td>
        </tr></table>
      </div>
      ${imgBlock(imgs.insta, 'Plat du restaurant', 340, 'max-height:260px;object-fit:cover;')}
      <div style="padding:12px 14px;">
        <div style="font-size:13px;font-weight:700;color:#1a1a1a;margin-bottom:6px;">❤️ 847 j'aime</div>
        <div style="font-size:13px;color:#1a1a1a;line-height:1.5;"><strong>le_ptit_bistrot_paris4</strong> Notre tartiflette maison... un plat qui réchauffe les soirées parisiennes 🍷</div>
        <div style="font-size:12px;color:#888;margin-top:4px;">#restaurant #paris4 #bistrot #foodparis</div>
        <div style="font-size:11px;color:#aaa;margin-top:6px;text-transform:uppercase;letter-spacing:0.5px;">Il y a 2 heures</div>
      </div>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 24px;"><table width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="width:33%;padding:0 6px 0 0;"><div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 10px;text-align:center;"><div style="font-size:26px;font-weight:900;color:#e8944a;">70%</div><div style="font-size:11px;color:#555;margin-top:6px;line-height:1.4;">des millennials consultent Instagram avant de choisir un restaurant</div></div></td>
    <td style="width:33%;padding:0 3px;"><div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 10px;text-align:center;"><div style="font-size:26px;font-weight:900;color:#e8944a;">+20%</div><div style="font-size:11px;color:#555;margin-top:6px;line-height:1.4;">de réservations pour les restaurants actifs sur Instagram</div></div></td>
    <td style="width:33%;padding:0 0 0 6px;"><div style="background:#fff7ed;border:2px solid #e8944a;border-radius:8px;padding:16px 10px;text-align:center;"><div style="font-size:22px;font-weight:900;color:#e8944a;">5 000</div><div style="font-size:11px;color:#555;margin-top:6px;line-height:1.4;">nouvelles personnes touchées par post bien construit</div></div></td>
  </tr></table></td></tr>

  <tr><td style="padding:0 28px 20px;"><div style="background:#1a1a1a;border-radius:8px;padding:22px 24px;"><p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#e8944a;text-transform:uppercase;letter-spacing:1px;">Ce qu'on gère pour vous</p><p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Création et optimisation complète du compte Instagram</p><p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ Stratégie éditoriale sur mesure (hashtags, horaires, tonalité)</p><p style="margin:0 0 8px;color:#fff;font-size:13px;">✓ 12 posts/mois rédigés + visuels créés</p><p style="margin:0;color:#fff;font-size:13px;">✓ Reporting mensuel des performances</p></div></td></tr>

  <tr><td style="padding:0 28px 28px;"><div style="border:3px solid #c0392b;border-radius:8px;padding:20px 24px;text-align:center;background:#fff5f5;"><div style="font-size:13px;color:#c0392b;text-transform:uppercase;letter-spacing:2px;font-weight:700;margin-bottom:8px;">Offre limitée</div><div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">300€<span style="font-size:18px;color:#888;">/mois</span></div><div style="font-size:14px;color:#c0392b;font-weight:700;margin-top:8px;">Premier mois offert si signature avant vendredi</div></div></td></tr>

  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Gestion%20Instagram%20Bistrot&body=Bonjour%2C%0A%0AJe%20suis%20int%C3%A9ress%C3%A9%20par%20la%20gestion%20Instagram.%0A%0AMon%20restaurant%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux être sur Instagram →
    </a>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;"><p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p></td></tr>
</table></td></tr></table></body></html>`,
};

// ────────────────────────────────────────────────────────────────────────────
// EMAIL 4 — Pitch influenceurs food
// ────────────────────────────────────────────────────────────────────────────
const email4 = {
  from: FROM, to: TO,
  subject: 'Et si 50 000 personnes découvraient votre restaurant ce mois-ci ?',
  html: `<!DOCTYPE html><html lang="fr"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;">
<tr><td align="center" style="padding:20px 10px;">
<table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background:#fff;">

  <tr><td style="background:#1a1a1a;padding:28px 32px;text-align:center;">
    <div style="font-size:26px;font-weight:900;letter-spacing:4px;color:#fff;font-family:Georgia,serif;">THE COPY CRAFT</div>
    <div style="font-size:13px;color:#e8944a;letter-spacing:2px;margin-top:6px;text-transform:uppercase;">Votre présence en ligne, notre expertise</div>
  </td></tr>

  <tr><td style="padding:0;">${imgBlock(imgs.influencer, 'Influenceur lifestyle restaurant', 600)}</td></tr>

  <tr><td style="padding:28px 28px 20px;">
    <p style="margin:0 0 16px;font-size:20px;font-weight:900;color:#1a1a1a;line-height:1.3;">Un micro-influenceur food à Paris publie une story dans votre restaurant.<br><span style="color:#e8944a;">Le lendemain : 200 nouvelles réservations.</span></p>
    <p style="margin:0;font-size:15px;color:#444;line-height:1.8;">Ce n'est pas une hypothèse. C'est ce qui arrive chaque semaine à vos concurrents. Ils remplissent leurs salles via des influenceurs food parisiens, pendant que vous attendez.</p>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:14px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Le type de contenu qu'on génère pour vous</p>
    <div style="border-radius:10px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.12);">
      ${imgBlock(imgs.food2, 'Contenu food influenceur', 544, 'max-height:300px;object-fit:cover;')}
      <div style="background:#1a1a1a;padding:12px 16px;text-align:center;"><span style="font-size:12px;color:#e8944a;font-weight:700;">Photos et vidéos professionnelles · Utilisables sur vos propres réseaux</span></div>
    </div>
  </td></tr>

  <tr><td style="padding:0 28px 24px;">
    <p style="margin:0 0 14px;font-size:16px;font-weight:700;color:#1a1a1a;text-align:center;text-transform:uppercase;letter-spacing:1px;">Comparatif des canaux d'acquisition</p>
    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">
      <tr style="background:#1a1a1a;"><td style="padding:12px 14px;color:#fff;font-size:12px;font-weight:700;width:34%;">Critère</td><td style="padding:12px 10px;color:#aaa;font-size:12px;font-weight:700;text-align:center;width:22%;">Google Ads</td><td style="padding:12px 10px;color:#aaa;font-size:12px;font-weight:700;text-align:center;width:22%;">Meta Ads</td><td style="padding:12px 10px;color:#e8944a;font-size:12px;font-weight:700;text-align:center;width:22%;">Micro-influenceur</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:11px 14px;font-size:13px;color:#333;border-bottom:1px solid #eee;">Coût pour 10 000 vues</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#555;border-bottom:1px solid #eee;">300–500€</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#555;border-bottom:1px solid #eee;">150–300€</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#e8944a;font-weight:700;border-bottom:1px solid #eee;">50–100€</td></tr>
      <tr style="background:#fff;"><td style="padding:11px 14px;font-size:13px;color:#333;border-bottom:1px solid #eee;">Confiance audience</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Faible</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Faible</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Très haute</td></tr>
      <tr style="background:#f9f9f9;"><td style="padding:11px 14px;font-size:13px;color:#333;border-bottom:1px solid #eee;">Contenu réutilisable</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Non</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#dc2626;border-bottom:1px solid #eee;">Non</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#16a34a;font-weight:700;border-bottom:1px solid #eee;">Oui (photos+vidéos)</td></tr>
      <tr style="background:#fff;"><td style="padding:11px 14px;font-size:13px;color:#333;">Durée de vie</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#dc2626;">0 après arrêt</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#dc2626;">0 après arrêt</td><td style="padding:11px 10px;text-align:center;font-size:13px;color:#16a34a;font-weight:700;">Permanent</td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 28px 20px;">
    <p style="margin:0 0 16px;font-size:16px;font-weight:700;color:#1a1a1a;text-transform:uppercase;letter-spacing:1px;">Comment ça marche</p>
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr><td style="padding-bottom:16px;"><div style="width:32px;height:32px;background:#e8944a;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:900;font-size:15px;float:left;margin-right:14px;">1</div><div style="overflow:hidden;"><strong style="font-size:14px;color:#1a1a1a;">Sélection des influenceurs</strong><p style="margin:4px 0 0;font-size:13px;color:#555;line-height:1.6;">On identifie 3 micro-influenceurs food Paris (10k–100k abonnés) qui correspondent exactement à votre univers.</p></div></td></tr>
      <tr><td style="padding-bottom:16px;"><div style="width:32px;height:32px;background:#e8944a;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:900;font-size:15px;float:left;margin-right:14px;">2</div><div style="overflow:hidden;"><strong style="font-size:14px;color:#1a1a1a;">On gère tout</strong><p style="margin:4px 0 0;font-size:13px;color:#555;line-height:1.6;">Contact, brief créatif, organisation de la visite, validation du contenu avant publication.</p></div></td></tr>
      <tr><td><div style="width:32px;height:32px;background:#e8944a;border-radius:50%;text-align:center;line-height:32px;color:#fff;font-weight:900;font-size:15px;float:left;margin-right:14px;">3</div><div style="overflow:hidden;"><strong style="font-size:14px;color:#1a1a1a;">Vous recevez les résultats</strong><p style="margin:4px 0 0;font-size:13px;color:#555;line-height:1.6;">Photos et vidéos pro à conserver + rapport de performance détaillé (vues, engagement, réservations).</p></div></td></tr>
    </table>
  </td></tr>

  <tr><td style="padding:0 28px 28px;"><div style="border:3px solid #1a1a1a;border-radius:8px;padding:20px 24px;text-align:center;"><div style="font-size:13px;color:#888;text-transform:uppercase;letter-spacing:2px;margin-bottom:8px;">3 influenceurs inclus</div><div style="font-size:42px;font-weight:900;color:#1a1a1a;line-height:1;">500€<span style="font-size:18px;color:#888;">/mois</span></div><div style="font-size:14px;color:#e8944a;font-weight:700;margin-top:4px;">Contact, brief, visite, contenu, rapport — tout géré</div></div></td></tr>

  <tr><td style="padding:0 28px 36px;text-align:center;">
    <a href="mailto:contact@thecopycraft.fr?subject=Campagne%20influenceurs&body=Bonjour%2C%0A%0AJe%20souhaite%20tester%20une%20campagne%20micro-influenceurs.%0A%0AMon%20restaurant%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0A%0ACordialement"
      style="display:inline-block;background:#1a1a1a;color:#fff;font-size:15px;font-weight:700;padding:16px 32px;border-radius:4px;text-decoration:none;letter-spacing:1px;">
      Je veux tester avec un influenceur →
    </a>
  </td></tr>

  <tr><td style="background:#1a1a1a;padding:18px 28px;text-align:center;"><p style="margin:0;color:#888;font-size:12px;">TheCopyCraft · contact@thecopycraft.fr · Paris</p></td></tr>
</table></td></tr></table></body></html>`,
};

// ── ENVOI ────────────────────────────────────────────────────────────────────
console.log('📧 Envoi des 4 emails...\n');

const emails = [
  { label: 'Email 1 — Google My Business absent', mail: email1 },
  { label: 'Email 2 — Site web absent (3 vrais mockups)', mail: email2 },
  { label: "Email 3 — Instagram absent (mock post réel)", mail: email3 },
  { label: 'Email 4 — Influenceurs food', mail: email4 },
];

for (const { label, mail } of emails) {
  try {
    const info = await transporter.sendMail(mail);
    console.log(`✅ ${label} → envoyé (${info.messageId})`);
  } catch (err) {
    console.error(`❌ ${label} → erreur: ${err.message}`);
  }
  await sleep(2000);
}

console.log('\n✅ Terminé.');
