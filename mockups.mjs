/**
 * mockups.mjs — Génère 3 vrais screenshots de sites mockup par secteur
 * Utilisé par campaign-full.mjs pour Email C (pas de site web)
 */

import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import http from 'http';
import https from 'https';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);
const IMG_DIR = path.join(__dirname, 'tmp_emails');
if (!fs.existsSync(IMG_DIR)) fs.mkdirSync(IMG_DIR, { recursive: true });

// ── Upload full-size vers litterbox.catbox.moe ────────────────────────────────
async function uploadToLitterbox(filePath) {
  return new Promise((resolve) => {
    if (!fs.existsSync(filePath) || fs.statSync(filePath).size < 1000) return resolve(null);

    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);
    const fileData = fs.readFileSync(filePath);
    const filename = path.basename(filePath);

    const body = Buffer.concat([
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="reqtype"\r\n\r\nfileupload\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="time"\r\n\r\n72h\r\n`),
      Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="fileToUpload"; filename="${filename}"\r\nContent-Type: image/jpeg\r\n\r\n`),
      fileData,
      Buffer.from(`\r\n--${boundary}--\r\n`),
    ]);

    const options = {
      hostname: 'litterbox.catbox.moe',
      path: '/resources/internals/api.php',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': body.length,
        'User-Agent': 'Mozilla/5.0',
      },
    };

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        const url = data.trim();
        resolve(url.startsWith('https://litter.catbox.moe/') ? url : null);
      });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(60000, () => { req.destroy(); resolve(null); });
    req.write(body);
    req.end();
  });
}

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

// ── Images hero locales par secteur ──────────────────────────────────────────
const HERO_IMAGES = {
  restaurant:          'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=1200&q=85',
  salon_coiffure:      'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=1200&q=85',
  estheticienne:       'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=1200&q=85',
  spa:                 'https://images.unsplash.com/photo-1540555700478-4be289fbecef?w=1200&q=85',
  clinique_esthetique: 'https://images.unsplash.com/photo-1576091160550-2173dba999ef?w=1200&q=85',
  architecte_interieur:'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?w=1200&q=85',
};

async function getImageBase64(secteur) {
  const url = HERO_IMAGES[secteur] || HERO_IMAGES.restaurant;
  const file = path.join(IMG_DIR, `hero_mockup_${secteur}.jpg`);
  if (!fs.existsSync(file) || fs.statSync(file).size < 10000) {
    try {
      await execAsync(`curl -sL --max-time 20 -A "Mozilla/5.0" -o "${file}" "${url}"`);
    } catch(e) { return null; }
  }
  if (!fs.existsSync(file) || fs.statSync(file).size < 1000) return null;
  return `data:image/jpeg;base64,${fs.readFileSync(file).toString('base64')}`;
}

// ── Templates HTML mockup par style ──────────────────────────────────────────

function buildDark(nom, secteur, heroB64) {
  const img = heroB64
    ? `<img src="${heroB64}" style="width:100%;height:420px;object-fit:cover;opacity:0.45;display:block;" />`
    : `<div style="width:100%;height:420px;background:#222;"></div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#0a0a0a;font-family:Georgia,serif;color:#fff;}
    nav{background:#0a0a0a;padding:18px 44px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #1f1f1f;}
    .logo{font-size:17px;font-weight:700;letter-spacing:5px;color:#c9a96e;text-transform:uppercase;}
    .nav-links a{color:#666;text-decoration:none;font-size:11px;letter-spacing:2px;text-transform:uppercase;margin-left:28px;}
    .hero{position:relative;height:420px;overflow:hidden;}
    .hero-txt{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;}
    h1{font-size:42px;font-weight:400;letter-spacing:6px;text-transform:uppercase;margin-bottom:12px;}
    .sub{font-size:13px;color:#c9a96e;letter-spacing:3px;text-transform:uppercase;margin-bottom:28px;}
    .btn{border:1px solid #c9a96e;color:#c9a96e;padding:12px 36px;font-size:11px;letter-spacing:3px;text-transform:uppercase;display:inline-block;}
    .services{padding:60px 44px;display:grid;grid-template-columns:repeat(4,1fr);gap:1px;background:#1a1a1a;}
    .svc{background:#0a0a0a;padding:30px 16px;text-align:center;}
    .svc h3{font-size:10px;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:8px;}
    .svc .price{font-size:26px;margin-bottom:6px;}
    .svc p{font-size:11px;color:#444;line-height:1.7;}
    .review{background:#0f0f0f;padding:44px;text-align:center;border-top:1px solid #1a1a1a;}
    .stars{font-size:18px;color:#c9a96e;margin-bottom:8px;}
    .review h2{font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#c9a96e;margin-bottom:14px;}
    .rev-num{font-size:48px;font-weight:700;line-height:1;}
    .rev-sub{font-size:11px;color:#444;margin-top:6px;}
    footer{background:#000;padding:22px 44px;text-align:center;font-size:10px;color:#2a2a2a;letter-spacing:2px;}
  </style></head><body>
    <nav>
      <div class="logo">${nom}</div>
      <div><a href="#">Services</a><a href="#">Galerie</a><a href="#">Réserver</a></div>
    </nav>
    <div class="hero">
      ${img}
      <div class="hero-txt">
        <h1>${nom}</h1>
        <div class="sub">${secteur.replace(/_/g,' ')} · Paris</div>
        <div class="btn">Prendre rendez-vous</div>
      </div>
    </div>
    <div class="services">
      <div class="svc"><h3>Prestation 1</h3><div class="price">45€</div><p>Description courte du service proposé</p></div>
      <div class="svc"><h3>Prestation 2</h3><div class="price">65€</div><p>Description courte du service proposé</p></div>
      <div class="svc"><h3>Prestation 3</h3><div class="price">90€</div><p>Description courte du service proposé</p></div>
      <div class="svc"><h3>Prestation 4</h3><div class="price">120€</div><p>Description courte du service proposé</p></div>
    </div>
    <div class="review">
      <h2>Avis clients</h2>
      <div class="stars">★★★★★</div>
      <div class="rev-num">5,0/5</div>
      <div class="rev-sub">Avis vérifiés Google My Business</div>
    </div>
    <footer>${nom.toUpperCase()} · Paris · contact@${nom.toLowerCase().replace(/\s+/g,'-')}.fr</footer>
  </body></html>`;
}

function buildWarm(nom, secteur, heroB64) {
  const img = heroB64
    ? `<img src="${heroB64}" style="width:100%;height:440px;object-fit:cover;display:block;" />`
    : `<div style="width:100%;height:440px;background:#c17d4b;"></div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#f8f4ef;font-family:Georgia,serif;color:#3d2b1f;}
    nav{background:#fff;padding:18px 44px;display:flex;justify-content:space-between;align-items:center;border-bottom:1px solid #e8ddd5;}
    .logo{font-size:20px;font-weight:700;color:#b8955c;letter-spacing:2px;}
    .btn-nav{background:#c17d4b;color:#fff;padding:10px 22px;font-size:13px;text-decoration:none;}
    .hero{position:relative;height:440px;overflow:hidden;}
    .hero-ov{position:absolute;inset:0;background:rgba(61,43,31,0.5);display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:40px;}
    h1{font-size:44px;color:#f5e8d5;letter-spacing:2px;margin-bottom:10px;}
    .sub{font-size:16px;color:#d4af7a;font-style:italic;margin-bottom:26px;}
    .btn{background:#c17d4b;color:#fff;padding:13px 34px;font-size:13px;display:inline-block;}
    .services{padding:60px 44px;background:#fff;text-align:center;}
    .services h2{font-size:26px;color:#b8955c;letter-spacing:2px;margin-bottom:40px;}
    .grid{display:grid;grid-template-columns:repeat(4,1fr);gap:20px;}
    .card{border:1px solid #e8ddd5;padding:28px 16px;text-align:center;}
    .icon{font-size:24px;margin-bottom:10px;}
    .card h3{font-size:12px;color:#b8955c;letter-spacing:1px;margin-bottom:6px;}
    .price{font-size:22px;font-weight:700;}
    .avis{background:#3d2b1f;padding:48px 44px;text-align:center;}
    .stars{color:#d4af7a;font-size:20px;margin-bottom:8px;}
    .avis blockquote{font-size:16px;color:#f5e8d5;font-style:italic;max-width:540px;margin:0 auto 12px;}
    .avis cite{font-size:12px;color:#9a8070;}
    footer{background:#2a1e14;padding:22px;text-align:center;font-size:11px;color:#7a6050;letter-spacing:1px;}
  </style></head><body>
    <nav><div class="logo">${nom}</div><a href="#" class="btn-nav">Réserver</a></nav>
    <div class="hero">
      ${img}
      <div class="hero-ov">
        <h1>${nom}</h1>
        <div class="sub">L'excellence à votre service</div>
        <div class="btn">Prendre rendez-vous</div>
      </div>
    </div>
    <div class="services">
      <h2>Nos prestations</h2>
      <div class="grid">
        <div class="card"><div class="icon">✦</div><h3>Prestation 1</h3><div class="price">45€</div></div>
        <div class="card"><div class="icon">✦</div><h3>Prestation 2</h3><div class="price">65€</div></div>
        <div class="card"><div class="icon">✦</div><h3>Prestation 3</h3><div class="price">90€</div></div>
        <div class="card"><div class="icon">✦</div><h3>Prestation 4</h3><div class="price">120€</div></div>
      </div>
    </div>
    <div class="avis">
      <div class="stars">★★★★★</div>
      <blockquote>"Un établissement d'exception. Service impeccable, résultat parfait. Je recommande vivement."</blockquote>
      <cite>Client fidèle · Avis Google vérifié</cite>
    </div>
    <footer>${nom.toUpperCase()} · Paris · 01 23 45 67 89</footer>
  </body></html>`;
}

function buildModern(nom, secteur, heroB64) {
  const img = heroB64
    ? `<img src="${heroB64}" style="width:100%;height:100%;object-fit:cover;display:block;" />`
    : `<div style="background:#1a4a3a;height:100%;"></div>`;
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    *{margin:0;padding:0;box-sizing:border-box;}
    body{background:#fff;font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;}
    nav{background:#fff;padding:16px 44px;display:flex;justify-content:space-between;align-items:center;border-bottom:2px solid #1a4a3a;}
    .logo{font-size:17px;font-weight:900;color:#1a4a3a;letter-spacing:1px;}
    .nav-links a{color:#555;text-decoration:none;font-size:13px;margin-left:24px;}
    .btn-g{background:#1a4a3a;color:#fff;padding:10px 22px;font-size:13px;font-weight:700;text-decoration:none;}
    .hero{display:flex;height:480px;}
    .hero-img{flex:1;overflow:hidden;}
    .hero-txt{flex:1;background:#f0f8f4;display:flex;flex-direction:column;justify-content:center;padding:52px 44px;}
    .tag{font-size:10px;color:#1a4a3a;text-transform:uppercase;letter-spacing:3px;font-weight:700;margin-bottom:14px;}
    h1{font-size:36px;font-weight:900;line-height:1.2;margin-bottom:16px;}
    .hero-p{font-size:14px;color:#666;line-height:1.8;margin-bottom:28px;}
    .btn-main{background:#1a4a3a;color:#fff;padding:13px 28px;font-size:14px;font-weight:700;text-decoration:none;display:inline-block;}
    .services{padding:70px 44px;}
    .services h2{font-size:28px;font-weight:900;margin-bottom:8px;}
    .sub{font-size:14px;color:#888;margin-bottom:40px;}
    .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;}
    .card{border:1px solid #e8e8e8;padding:28px 22px;}
    .num{font-size:10px;color:#1a4a3a;font-weight:700;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;}
    .card h3{font-size:16px;font-weight:800;margin-bottom:6px;}
    .price{font-size:20px;font-weight:700;color:#1a4a3a;margin-bottom:6px;}
    .card p{font-size:12px;color:#888;line-height:1.7;}
    .reviews{background:#f0f8f4;padding:50px 44px;display:flex;align-items:center;gap:60px;}
    .rev-big{font-size:64px;font-weight:900;color:#1a4a3a;line-height:1;}
    .stars{color:#f59e0b;font-size:18px;margin-top:6px;}
    .rev-sub{font-size:12px;color:#888;margin-top:6px;}
    .rev-text{font-size:15px;font-style:italic;color:#333;line-height:1.7;max-width:460px;}
    footer{background:#1a4a3a;color:#fff;padding:24px 44px;display:flex;justify-content:space-between;font-size:12px;}
  </style></head><body>
    <nav>
      <div class="logo">${nom}</div>
      <div class="nav-links">
        <a href="#">Services</a><a href="#">Avis</a><a href="#">Contact</a>
        <a href="#" class="btn-g">Réserver →</a>
      </div>
    </nav>
    <div class="hero">
      <div class="hero-img">${img}</div>
      <div class="hero-txt">
        <div class="tag">Paris · Depuis 2015</div>
        <h1>Votre expertise de confiance</h1>
        <div class="hero-p">Excellence, savoir-faire et personnalisation — pour chaque client, une expérience unique.</div>
        <a href="#" class="btn-main">Prendre rendez-vous →</a>
      </div>
    </div>
    <div class="services">
      <h2>Nos prestations</h2>
      <div class="sub">Des services sur mesure pour chaque besoin</div>
      <div class="grid">
        <div class="card"><div class="num">01</div><h3>Prestation A</h3><div class="price">45€</div><p>Description courte du service, personnalisée et professionnelle.</p></div>
        <div class="card"><div class="num">02</div><h3>Prestation B</h3><div class="price">65€</div><p>Description courte du service, personnalisée et professionnelle.</p></div>
        <div class="card"><div class="num">03</div><h3>Prestation C</h3><div class="price">90€</div><p>Description courte du service, personnalisée et professionnelle.</p></div>
        <div class="card"><div class="num">04</div><h3>Prestation D</h3><div class="price">120€</div><p>Description courte du service, personnalisée et professionnelle.</p></div>
        <div class="card"><div class="num">05</div><h3>Prestation E</h3><div class="price">150€</div><p>Description courte du service, personnalisée et professionnelle.</p></div>
        <div class="card"><div class="num">06</div><h3>Prestation F</h3><div class="price">200€</div><p>Description courte du service, personnalisée et professionnelle.</p></div>
      </div>
    </div>
    <div class="reviews">
      <div><div class="rev-big">★★★★★</div><div class="rev-sub">Avis vérifiés · Google My Business</div></div>
      <div class="rev-text">"Établissement exceptionnel. Accueil parfait, résultats au-delà des attentes. Je recommande sans hésiter."<br><strong style="font-size:13px;color:#1a4a3a;font-style:normal;display:block;margin-top:10px;">— Client fidèle</strong></div>
    </div>
    <footer><span>© 2025 ${nom}</span><span>Paris · contact@${nom.toLowerCase().replace(/\s+/g,'-')}.fr</span></footer>
  </body></html>`;
}

// ── Génère les 3 mockups et retourne leurs base64 ────────────────────────────
export async function generateMockupScreenshots(lead) {
  const { nom, secteur } = lead;
  console.log(`  🎨 Génération mockups Puppeteer pour "${nom}"...`);

  const heroB64 = await getImageBase64(secteur);

  const templates = [
    { style: 'dark',   label: 'Élégant & Minimaliste', html: buildDark(nom, secteur, heroB64) },
    { style: 'warm',   label: 'Chaleureux & Premium',  html: buildWarm(nom, secteur, heroB64) },
    { style: 'modern', label: 'Moderne & Épuré',        html: buildModern(nom, secteur, heroB64) },
  ];

  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = [];

  for (const { style, label, html } of templates) {
    const thumbPath = path.join(IMG_DIR, `mockup_${style}_thumb_${Date.now()}.jpg`);
    const fullPath  = path.join(IMG_DIR, `mockup_${style}_full_${Date.now()}.jpg`);
    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1200, height: 900, deviceScaleFactor: 1 });
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      await sleep(1200);

      // Thumbnail — top 520px pour aperçu dans l'email
      await page.screenshot({ path: thumbPath, type: 'jpeg', quality: 85, clip: { x: 0, y: 0, width: 1200, height: 520 } });

      // Full page — tout le site scrollable
      await page.screenshot({ path: fullPath, type: 'jpeg', quality: 88, fullPage: true });

      await page.close();

      const thumbSize = fs.existsSync(thumbPath) ? fs.statSync(thumbPath).size : 0;
      const fullSize  = fs.existsSync(fullPath)  ? fs.statSync(fullPath).size  : 0;

      if (thumbSize > 5000) {
        const b64thumb = `data:image/jpeg;base64,${fs.readFileSync(thumbPath).toString('base64')}`;

        // Upload full sur litterbox → URL cliquable (les data: URI sont bloqués par les clients email)
        console.log(`    ⬆️  Upload full "${label}" vers litterbox...`);
        const fullUrl = await uploadToLitterbox(fullPath);
        console.log(`    ✅ "${label}" — thumb ${Math.round(thumbSize/1024)}KB · full ${fullUrl ? fullUrl : '⚠️ upload échoué'}`);

        results.push({ label, b64thumb, fullUrl });
      } else {
        console.log(`    ⚠️ "${label}" trop petit (${thumbSize}o), skip`);
        results.push({ label, b64thumb: null, fullUrl: null });
      }
    } catch(e) {
      console.log(`    ❌ "${label}": ${e.message.slice(0, 60)}`);
      results.push({ label, b64thumb: null, fullUrl: null });
    } finally {
      if (fs.existsSync(thumbPath)) fs.unlinkSync(thumbPath);
      if (fs.existsSync(fullPath))  fs.unlinkSync(fullPath);
    }
    await sleep(300);
  }

  await browser.close();
  return results; // [{ label, b64thumb, b64full }, ...]
}
