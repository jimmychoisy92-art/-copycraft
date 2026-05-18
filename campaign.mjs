import nodemailer from 'nodemailer';
import Groq from 'groq-sdk';
import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import { captureAndAnnotate, screenshotHtml } from './screenshot.mjs';
import { execSync } from 'child_process';
import fs from 'fs';

// ─── CONFIG ────────────────────────────────────────────────────────────────
const LEADS_FILE    = './leads-all.json';
const LOG_FILE      = './campaign-log.json';
const DAILY_LIMIT   = 30;         // 30 par secteur par jour
const DELAY_MS      = 2 * 60 * 1000; // 2 min entre chaque envoi

// Secteur passé en argument : node campaign.mjs estheticienne
// Sans argument → traite TOUS les secteurs (30 × nb secteurs)
const SECTEUR_ARG = process.argv[2] || null;
// ───────────────────────────────────────────────────────────────────────────

const groq      = new Groq({ apiKey: 'process.env.GROQ_API_KEY' });
const anthropic = new Anthropic({ apiKey: 'process.env.ANTHROPIC_API_KEY' });

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net', port: 465, secure: true,
  auth: { user: 'contact@thecopycraft.fr', pass: 'pompiers94Creteil.' },
});

const PHOTOS = {
  spa:              'photo-1544161515-4ab6ce6db874',
  massage:          'photo-1544161515-4ab6ce6db874',
  soin_visage:      'photo-1570172619644-dfd03ed5d881',
  esthetique:       'photo-1616394584738-fc6e612e71b9',
  estheticienne:    'photo-1616394584738-fc6e612e71b9',
  coiffure:         'photo-1562322140-8baeececf3df',
  salon_coiffure:   'photo-1562322140-8baeececf3df',
  clinique:         'photo-1612349317150-e413f6a5b16d',
  clinique_esthetique: 'photo-1612349317150-e413f6a5b16d',
  restaurant:       'photo-1414235077428-338989a2e8c0',
  architecte:       'photo-1600585154526-990dced4db0d',
  architecte_interieur: 'photo-1600585154526-990dced4db0d',
  coach:            'photo-1552581234-26160f608093',
  immobilier:       'photo-1560518883-ce09059eeffa',
  default:          'photo-1540555700478-4be289fbecef',
};

function getPhoto(secteur, pageText = '') {
  if (pageText.includes('massage')) return PHOTOS.massage;
  if (pageText.includes('visage')) return PHOTOS.soin_visage;
  if (pageText.includes('coiffure') || pageText.includes('cheveux')) return PHOTOS.coiffure;
  if (pageText.includes('clinique') || pageText.includes('médecine')) return PHOTOS.clinique;
  if (pageText.includes('restaurant') || pageText.includes('cuisine')) return PHOTOS.restaurant;
  return PHOTOS[secteur] || PHOTOS.default;
}

function loadJSON(file, fallback) { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; } }
function saveJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function uploadImage(filePath) {
  try {
    const result = execSync(
      `curl -s -F "reqtype=fileupload" -F "fileToUpload=@${filePath}" https://catbox.moe/user/api.php`,
      { timeout: 15000 }
    ).toString().trim();
    return result.startsWith('https://') ? result : null;
  } catch { return null; }
}

async function fetchWebsite(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    return html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000);
  } catch { return null; }
}

async function extractSiteStyle(url) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900 });
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 12000 });
    await new Promise(r => setTimeout(r, 2000));
    const style = await page.evaluate(() => {
      function rgbToHex(rgb) {
        if (!rgb || rgb === 'rgba(0, 0, 0, 0)' || rgb === 'transparent') return null;
        const m = rgb.match(/\d+/g);
        if (!m || m.length < 3) return null;
        return '#' + m.slice(0, 3).map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
      }
      const body = document.body;
      const bodyStyle = window.getComputedStyle(body);
      const h1 = document.querySelector('h1');
      const nav = document.querySelector('nav, header, [class*="header"]');
      const cta = document.querySelector('a[class*="btn"], a[class*="button"], button[class*="btn"], [class*="cta"], .btn, .button');
      const bgColor = rgbToHex(bodyStyle.backgroundColor) || '#ffffff';
      const textColor = rgbToHex(bodyStyle.color) || '#333333';
      const fontFamily = bodyStyle.fontFamily?.split(',')[0]?.replace(/['"]/g, '').trim() || 'Arial';
      const navBg = nav ? (rgbToHex(window.getComputedStyle(nav).backgroundColor) || null) : null;
      const ctaBg = cta ? (rgbToHex(window.getComputedStyle(cta).backgroundColor) || null) : null;
      const h1Color = h1 ? (rgbToHex(window.getComputedStyle(h1).color) || null) : null;
      const allBgs = [];
      document.querySelectorAll('section, div[class], aside, main').forEach(el => {
        const c = rgbToHex(window.getComputedStyle(el).backgroundColor);
        if (c && c !== '#ffffff' && c !== '#000000' && !allBgs.includes(c)) allBgs.push(c);
      });
      return { bgColor, textColor, fontFamily, navBg, ctaBg, h1Color, accentColors: allBgs.slice(0, 5), h1Text: h1?.textContent?.trim().slice(0, 80) || '' };
    });
    await browser.close();
    return style;
  } catch (e) {
    await browser.close();
    return null;
  }
}

async function analyzeWithGroq(nomInstitut, url, pageText) {
  const prompt = `Tu es un expert copywriter. Analyse cette page d'accueil et identifie 3 problèmes CONCRETS et SPÉCIFIQUES qui freinent les réservations.

Institut : ${nomInstitut}
URL : ${url}

Texte de la page :
${pageText}

Règles :
- Cite des éléments RÉELS de leur page (vrai titre, vraie phrase, vraie absence)
- Pas de généralités — sois précis sur CETTE page
- Ton sobre, direct
- point1 : problème complet avec explication (2 phrases max)
- point2 et point3 : thème du problème en une phrase courte

Réponds UNIQUEMENT en JSON :
{
  "point1": "...",
  "point2_apercu": "...",
  "point3_apercu": "..."
}`;

  const response = await groq.chat.completions.create({
    model: 'llama-3.3-70b-versatile', max_tokens: 600,
    messages: [{ role: 'user', content: prompt }],
  });
  try {
    const text = response.choices[0].message.content;
    return JSON.parse(text.match(/\{[\s\S]*\}/)[0]);
  } catch { return null; }
}

async function generateCustomHTML(nomInstitut, pageText, points, siteStyle, photoId, variante) {
  const photoUrl = `https://images.unsplash.com/${photoId}?w=1200&q=85`;
  const primaryColor = siteStyle?.ctaBg || siteStyle?.navBg || siteStyle?.h1Color || '#2d2d2d';
  const bgColor = siteStyle?.bgColor || '#ffffff';
  const textColor = siteStyle?.textColor || '#333333';
  const fontFamily = siteStyle?.fontFamily || 'Georgia';
  const accentColors = siteStyle?.accentColors || [];
  const h1Text = siteStyle?.h1Text || '';

  const directions = {
    1: {
      label: 'Minimaliste premium',
      description: `Layout split 50/50 : colonne gauche contenu (fond blanc, beaucoup d'air), colonne droite image pleine hauteur.
Nav ultra-fin, logo texte letterspacing important. H1 en serif élégant, grande taille. CTA outline (bordure, pas de fond plein).
Palette : garde ${primaryColor} comme couleur signature mais l'utilise avec parcimonie.
Fond global blanc ${bgColor}. Ambiance haut de gamme sobre.`,
    },
    2: {
      label: 'Hero immersif plein écran',
      description: `Hero image plein écran (100vw × 100vh) avec overlay gradient sombre en bas. Texte blanc centré par-dessus l'image.
Nav transparente superposée sur l'image. H1 très grand (60-70px) en sans-serif bold. CTA bouton plein arrondi avec couleur vive (${primaryColor} ou variante saturée).
Sous le hero : bande de 3 bénéfices sur fond ${accentColors[1] || '#f8f8f8'}. Témoignage sur fond contrasté.
Ambiance cinématographique, moderne, impact visuel fort.`,
    },
    3: {
      label: 'Editorial organique',
      description: `Mise en page asymétrique/editoriale. Nav avec fond de couleur ${accentColors[0] || primaryColor}.
Hero : grande image décalée à droite (60%), texte à gauche avec ligne verticale colorée.
Typographie mixte : titre en serif italic + sous-titre en sans-serif caps espacé.
CTA texte souligné élégant avec flèche →. Ambiance magazine de beauté haut de gamme.`,
    },
  };

  const dir = directions[variante];
  const prompt = `Tu es un designer web senior expert en sites de beauté, spa et bien-être haut de gamme. Tu crées des maquettes HTML/CSS impeccables.

MISSION : Crée la version ${variante}/3 d'une page d'accueil redessinée pour ce site.

═══ CONTEXTE DU SITE ORIGINAL ═══
Nom : ${nomInstitut}
Titre actuel de leur H1 : "${h1Text}"
Extrait du contenu : ${pageText.slice(0, 500)}
Couleurs extraites du vrai site : fond=${bgColor}, texte=${textColor}, CTA/accent=${primaryColor}, autres=${accentColors.join(', ')}
Police détectée : ${fontFamily}

═══ PROBLÈMES À CORRIGER ═══
1. ${points.point1}
2. ${points.point2_apercu}
3. ${points.point3_apercu}

═══ DIRECTION DE CETTE VERSION : "${dir.label}" ═══
${dir.description}

═══ CONTRAINTES TECHNIQUES STRICTES ═══
- HTML complet autonome, CSS INLINE UNIQUEMENT (pas de <style> tag), zéro JS
- body : width 1280px, margin 0, overflow hidden
- Image : <img src="${photoUrl}" ...> ou background-image url("${photoUrl}") — utilise-la obligatoirement
- Textes : invente des vrais textes copywriting percutants cohérents avec l'univers du site — JAMAIS "Bénéfice 1" ou "Lorem ipsum"
- CTA : texte d'action précis (ex: "Réserver ma séance", "Prendre rendez-vous", "Découvrir les soins")
- Témoignage : prénom féminin + âge + avis crédible 2 phrases, étoiles ★★★★★
- Structure obligatoire : nav → hero → 3 bénéfices → témoignage
- Rendu visible dans les 900 premiers pixels de hauteur

Génère UNIQUEMENT le HTML brut. Pas de \`\`\`html, pas de commentaires.`;

  let response;
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 3500,
        messages: [{ role: 'user', content: prompt }],
      });
      break;
    } catch (e) {
      if (e.status === 529 && attempt < 4) {
        console.log(`    ⏳ Claude surchargé, retry ${attempt}/3 dans 30s...`);
        await new Promise(r => setTimeout(r, 30000));
      } else throw e;
    }
  }

  let html = response.content[0].text;
  html = html.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();
  if (!html.includes('width:1280') && !html.includes('width: 1280')) {
    html = html.replace('<body', '<body style="width:1280px;margin:0;overflow:hidden;"');
  }
  return html;
}

const ACCROCHES = [
  (nom) => `En analysant le site de ${nom}, j'ai identifié 3 opportunités concrètes pour convertir davantage de visiteurs en clients.`,
  (nom) => `Je me suis permis de visiter le site de ${nom} et j'ai repéré 3 ajustements qui pourraient significativement augmenter vos réservations.`,
  (nom) => `En tant que copywriter spécialisé dans ce secteur, j'ai analysé le site de ${nom} — voici 3 points concrets qui pourraient vous ramener davantage de clients.`,
];

function buildEmailHTML(lead, points, urlBefore, urlAfter1, urlAfter2, urlAfter3) {
  const accroche = ACCROCHES[Math.floor(Math.random() * ACCROCHES.length)](lead.nom);
  return `<!DOCTYPE html>
<html lang="fr">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Georgia,serif;">

<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:30px 20px 0;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:8px 8px 0 0;">
      <tr><td align="center" style="padding:28px 40px;">
        <span style="font-family:Arial,sans-serif;font-size:22px;font-weight:bold;color:#fff;letter-spacing:2px;">THE COPY CRAFT</span><br>
        <span style="font-size:11px;color:#999;letter-spacing:3px;text-transform:uppercase;">Audit · Copywriting · Conversion</span>
      </td></tr>
    </table>
  </td></tr>
</table>

<table width="100%" cellpadding="0" cellspacing="0">
  <tr><td align="center" style="padding:0 20px 30px;">
    <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:0 0 8px 8px;box-shadow:0 2px 12px rgba(0,0,0,0.08);">
      <tr><td style="padding:40px;">

        <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 24px;">Bonjour,</p>
        <p style="font-size:15px;color:#333;line-height:1.7;margin:0 0 32px;">${accroche}</p>
        <hr style="border:none;border-top:1px solid #eee;margin:0 0 32px;">

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
          <tr><td style="background:#fff8f0;border-left:4px solid #e8944a;border-radius:0 6px 6px 0;padding:20px 24px;">
            <p style="margin:0 0 8px;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;color:#e8944a;letter-spacing:2px;text-transform:uppercase;">Point n°1 — Révélé</p>
            <p style="margin:0;font-size:14px;color:#333;line-height:1.7;">${points.point1}</p>
          </td></tr>
        </table>

        <p style="font-family:Arial,sans-serif;font-size:13px;color:#666;margin:0 0 16px;">J'ai également identifié <strong>2 autres points critiques</strong> :</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:12px;">
          <tr><td style="background:#f9f9f9;border:1px dashed #ddd;border-radius:6px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Point n°2</p>
            <p style="margin:0;font-size:14px;color:#aaa;font-style:italic;">${points.point2_apercu} — <span style="background:#ddd;color:#ddd;border-radius:3px;padding:0 4px;">détail masqué</span></p>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
          <tr><td style="background:#f9f9f9;border:1px dashed #ddd;border-radius:6px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-family:Arial,sans-serif;font-size:11px;color:#999;letter-spacing:1px;text-transform:uppercase;">Point n°3</p>
            <p style="margin:0;font-size:14px;color:#aaa;font-style:italic;">${points.point3_apercu} — <span style="background:#ddd;color:#ddd;border-radius:3px;padding:0 4px;">détail masqué</span></p>
          </td></tr>
        </table>

        <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#e8944a;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">▼ VOTRE SITE ACTUEL</p>
        <img src="${urlBefore}" style="width:100%;border-radius:8px;border:3px solid #e8944a;margin-bottom:28px;display:block;" alt="Votre site actuel"/>

        <p style="text-align:center;font-size:28px;margin:0 0 8px;color:#1a1a1a;">↓</p>
        <p style="text-align:center;font-family:Arial,sans-serif;font-size:13px;color:#666;margin:0 0 24px;">Une direction possible — conçue sur mesure pour votre site</p>

        <p style="font-family:Arial,sans-serif;font-size:12px;font-weight:bold;color:#555;letter-spacing:3px;text-transform:uppercase;margin:0 0 10px;">▼ VERSION 1 — Fidèle à votre style</p>
        <a href="${urlAfter1}" target="_blank" style="display:block;margin-bottom:8px;">
          <img src="${urlAfter1}" style="width:100%;border-radius:8px;border:2px solid #ddd;display:block;" alt="Version 1"/>
        </a>
        <p style="font-family:Arial,sans-serif;font-size:11px;color:#aaa;text-align:center;margin:0 0 28px;">Cliquez sur l'image pour la voir en grand</p>

        <p style="font-family:Arial,sans-serif;font-size:14px;color:#333;margin:0 0 20px;font-weight:bold;">Deux autres directions disponibles :</p>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
          <tr><td style="border-radius:8px;overflow:hidden;border:2px solid #e0d0b8;">
            <a href="mailto:contact@thecopycraft.fr?subject=Je%20veux%20voir%20la%20Version%202%20pour%20mon%20site&body=Bonjour%2C%0A%0AJ%27ai%20re%C3%A7u%20votre%20email%20et%20je%20souhaite%20voir%20la%20Version%202.%0A%0AMon%20site%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0ADisponibilit%C3%A9s%20%3A%20%0A%0ACordialement" style="display:block;">
              <img src="${urlAfter2}" style="width:100%;display:block;filter:blur(6px);opacity:0.35;" alt="Version 2"/>
            </a>
            <div style="background:#faf7f2;padding:20px;text-align:center;border-top:1px solid #e0d0b8;">
              <p style="font-family:Arial,sans-serif;font-size:12px;color:#9a7b6a;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Version 2 — Épurée &amp; Luxueuse</p>
              <a href="mailto:contact@thecopycraft.fr?subject=Je%20veux%20voir%20la%20Version%202%20pour%20mon%20site&body=Bonjour%2C%0A%0AJ%27ai%20re%C3%A7u%20votre%20email%20et%20je%20souhaite%20voir%20la%20Version%202.%0A%0AMon%20site%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0ADisponibilit%C3%A9s%20%3A%20%0A%0ACordialement" style="display:inline-block;background:#c9a07a;color:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:10px 24px;text-decoration:none;border-radius:2px;">Voir cette version →</a>
            </div>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
          <tr><td style="border-radius:8px;overflow:hidden;border:2px solid #dde8dd;">
            <a href="mailto:contact@thecopycraft.fr?subject=Je%20veux%20voir%20la%20Version%203%20pour%20mon%20site&body=Bonjour%2C%0A%0AJ%27ai%20re%C3%A7u%20votre%20email%20et%20je%20souhaite%20voir%20la%20Version%203.%0A%0AMon%20site%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0ADisponibilit%C3%A9s%20%3A%20%0A%0ACordialement" style="display:block;">
              <img src="${urlAfter3}" style="width:100%;display:block;filter:blur(6px);opacity:0.35;" alt="Version 3"/>
            </a>
            <div style="background:#f5f8f5;padding:20px;text-align:center;border-top:1px solid #dde8dd;">
              <p style="font-family:Arial,sans-serif;font-size:12px;color:#4a6a4a;letter-spacing:2px;text-transform:uppercase;margin:0 0 12px;">Version 3 — Contemporaine &amp; Audacieuse</p>
              <a href="mailto:contact@thecopycraft.fr?subject=Je%20veux%20voir%20la%20Version%203%20pour%20mon%20site&body=Bonjour%2C%0A%0AJ%27ai%20re%C3%A7u%20votre%20email%20et%20je%20souhaite%20voir%20la%20Version%203.%0A%0AMon%20site%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0ADisponibilit%C3%A9s%20%3A%20%0A%0ACordialement" style="display:inline-block;background:#4a7a4a;color:#fff;font-family:Arial,sans-serif;font-size:11px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;padding:10px 24px;text-decoration:none;border-radius:2px;">Voir cette version →</a>
            </div>
          </td></tr>
        </table>

        <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:36px;">
          <tr><td align="center">
            <a href="mailto:contact@thecopycraft.fr?subject=Oui%2C%20je%20veux%20l%27analyse%20compl%C3%A8te&body=Bonjour%2C%0A%0AJe%20souhaite%20en%20savoir%20plus%20sur%20votre%20analyse.%0A%0AMon%20site%20%3A%20%0AMon%20t%C3%A9l%C3%A9phone%20%3A%20%0ADisponibilit%C3%A9s%20%3A%20%0A%0ACordialement" style="display:inline-block;background:#1a1a1a;color:#fff;font-family:Arial,sans-serif;font-size:14px;font-weight:bold;text-decoration:none;padding:16px 36px;border-radius:4px;letter-spacing:1px;">Oui, je veux l'analyse complète →</a>
          </td></tr>
        </table>

        <hr style="border:none;border-top:1px solid #eee;margin:0 0 24px;">
        <p style="margin:0;font-family:Arial,sans-serif;font-size:13px;color:#666;line-height:1.6;">
          Bonne journée,<br>
          <strong style="color:#1a1a1a;">TheCopyCraft</strong><br>
          <a href="mailto:contact@thecopycraft.fr" style="color:#e8944a;text-decoration:none;">contact@thecopycraft.fr</a>
        </p>

      </td></tr>
    </table>
  </td></tr>
</table>
</body>
</html>`;
}

async function processLead(lead) {
  const pageText = await fetchWebsite(lead.website);
  if (!pageText) throw new Error('Site inaccessible');

  const siteStyle = await extractSiteStyle(lead.website);
  const points = await analyzeWithGroq(lead.nom, lead.website, pageText);
  if (!points) throw new Error('Analyse Groq échouée');

  const screenshotBefore = await captureAndAnnotate(lead.website, [
    { x: 5, y: 15, text: points.point1.slice(0, 90) },
    { x: 5, y: 45, text: points.point2_apercu },
    { x: 5, y: 70, text: points.point3_apercu },
  ]);

  const photoId = getPhoto(lead.secteur, pageText);
  const screenshots = [];
  for (let i = 1; i <= 3; i++) {
    const html = await generateCustomHTML(lead.nom, pageText, points, siteStyle, photoId, i);
    const path = await screenshotHtml(html);
    screenshots.push(path);
  }

  const urlBefore = await uploadImage(screenshotBefore);
  const urlAfter1 = await uploadImage(screenshots[0]);
  const urlAfter2 = await uploadImage(screenshots[1]);
  const urlAfter3 = await uploadImage(screenshots[2]);

  if (!urlBefore || !urlAfter1 || !urlAfter2 || !urlAfter3) throw new Error('Upload catbox échoué');

  const emailHtml = buildEmailHTML(lead, points, urlBefore, urlAfter1, urlAfter2, urlAfter3);

  await transporter.sendMail({
    from: '"TheCopyCraft" <contact@thecopycraft.fr>',
    to: lead.email,
    subject: `Votre site — quelques pistes pour plus de réservations`,
    html: emailHtml,
    text: `Bonjour,\n\nJ'ai analysé le site de ${lead.nom} et identifié 3 points d'amélioration.\n\n1. ${points.point1}\n2. ${points.point2_apercu}\n3. ${points.point3_apercu}\n\nTheCopyCraft\ncontact@thecopycraft.fr`,
    attachments: [],
  });

  return { points, urlAfter1 };
}

async function main() {
  // Charger leads + log
  const leads = loadJSON(LEADS_FILE, []);
  const log = loadJSON(LOG_FILE, { sentEmails: [], days: [] });

  // Leads éligibles : avec email, pas encore envoyés, pas refus/bounce
  const sentSet = new Set(log.sentEmails.map(e => e.email));
  const skipStatuts = new Set(['j0_envoyé','j3_relance','j7_relance','répondu','intéressé','rdv_planifié','proposition_envoyée','vendu','payé','refus','bounce','sans_suite']);

  const eligible = leads.filter(l =>
    l.email &&
    !sentSet.has(l.email) &&
    !skipStatuts.has(l.statut) &&
    (!SECTEUR_ARG || l.secteur === SECTEUR_ARG)
  );

  const secteurLabel = SECTEUR_ARG || 'tous secteurs';
  console.log(`\n📊 ${eligible.length} leads éligibles [${secteurLabel}] sur ${leads.length} total`);

  // Compteur journalier PAR secteur
  const today = new Date().toISOString().split('T')[0];
  const sentToday = log.sentEmails.filter(e =>
    e.date.startsWith(today) &&
    (!SECTEUR_ARG || e.secteur === SECTEUR_ARG)
  ).length;
  const remaining = DAILY_LIMIT - sentToday;

  if (remaining <= 0) {
    console.log(`\n⏸️  Limite journalière atteinte pour [${secteurLabel}] (${DAILY_LIMIT}/jour). Relance demain.`);
    return;
  }

  const batch = eligible.slice(0, remaining);
  console.log(`🚀 Envoi de ${batch.length} emails [${secteurLabel}] (${sentToday} déjà envoyés aujourd'hui)\n`);

  let success = 0, errors = 0;

  for (let i = 0; i < batch.length; i++) {
    const lead = batch[i];
    console.log(`[${i+1}/${batch.length}] ${lead.nom} (${lead.secteur}) — ${lead.email}`);

    try {
      const result = await processLead(lead);

      // Log l'envoi
      log.sentEmails.push({ email: lead.email, nom: lead.nom, secteur: lead.secteur, date: new Date().toISOString(), status: 'sent' });
      saveJSON(LOG_FILE, log);

      // Mettre à jour le statut dans leads-all.json
      const allLeads = loadJSON(LEADS_FILE, []);
      const idx = allLeads.findIndex(l => l.email === lead.email);
      if (idx !== -1) {
        allLeads[idx].statut = 'j0_envoyé';
        allLeads[idx].date_contact = today;
        saveJSON(LEADS_FILE, allLeads);
      }

      console.log(`  ✅ Envoyé — V1: ${result.urlAfter1}`);
      success++;

      // Pause entre envois (sauf dernier)
      if (i < batch.length - 1) {
        console.log(`  ⏳ Pause ${DELAY_MS/1000}s...\n`);
        await sleep(DELAY_MS);
      }

    } catch (err) {
      console.log(`  ❌ Erreur : ${err.message}`);
      log.sentEmails.push({ email: lead.email, nom: lead.nom, date: new Date().toISOString(), status: 'error', error: err.message });
      saveJSON(LOG_FILE, log);
      errors++;
    }
  }

  console.log(`\n✅ Terminé — ${success} envoyés, ${errors} erreurs`);
  console.log(`📈 Total campagne : ${log.sentEmails.filter(e=>e.status==='sent').length} emails envoyés`);
}

main().catch(console.error);
