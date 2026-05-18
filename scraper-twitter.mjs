// scraper-twitter.mjs — Scrape de micro-influenceurs Instagram via sources publiques
// Sources : Modash (listes publiques), Bing via Puppeteer, sites de classement FR
// Fallback : Nitter instances + Twitter search non-authentifié + DuckDuckGo
// Usage: node scraper-twitter.mjs

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'influenceurs-twitter.json');

// ─── CONFIG ───────────────────────────────────────────────────────────────────
const MIN_FOLLOWERS = 8000;
const MAX_FOLLOWERS = 80000;
const SLEEP_MS = 2000;

// ─── PAGES MODASH PAR SECTEUR ─────────────────────────────────────────────────
const MODASH_PAGES = [
  { url: 'https://www.modash.io/find-influencers/france/paris/beauty', secteur: 'estheticienne' },
  { url: 'https://www.modash.io/find-influencers/france/paris/food', secteur: 'restaurant' },
  { url: 'https://www.modash.io/find-influencers/france/paris/fashion', secteur: 'salon_coiffure' },
  { url: 'https://www.modash.io/find-influencers/france/paris/fitness', secteur: 'spa' },
  { url: 'https://www.modash.io/find-influencers/france/paris/lifestyle', secteur: 'clinique_esthetique' },
  // Variantes supplémentaires
  { url: 'https://www.modash.io/find-influencers/france/beauty', secteur: 'estheticienne' },
  { url: 'https://www.modash.io/find-influencers/france/skincare', secteur: 'clinique_esthetique' },
  { url: 'https://www.modash.io/find-influencers/france/food', secteur: 'restaurant' },
  { url: 'https://www.modash.io/find-influencers/france/fitness', secteur: 'spa' },
];

// ─── PAGES DE CLASSEMENT INFLUENCEURS FR ─────────────────────────────────────
const RANKING_PAGES = [
  { url: 'https://www.reech.com/fr/blog/top-influenceurs-beaute-instagram-france', secteur: 'estheticienne' },
  { url: 'https://www.clickanalytic.com/fr/top/influenceurs-beaute-instagram-france/', secteur: 'estheticienne' },
  { url: 'https://influence4you.com/influenceurs-instagram-france/', secteur: 'estheticienne' },
  { url: 'https://www.reech.com/fr/blog/top-influenceurs-food-instagram-france', secteur: 'restaurant' },
  { url: 'https://www.reech.com/fr/blog/top-influenceurs-deco-instagram-france', secteur: 'architecte_interieur' },
  { url: 'https://metricool.com/fr/influenceurs-decoration/', secteur: 'architecte_interieur' },
];

// ─── SEED DATA ARCHITECTE INTÉRIEUR ──────────────────────────────────────────
// Profils vérifiés via recherche web (métricool, articles, recherches Bing)
const SEED_ARCHITECTE = [
  { handle: '@alichuree', nom: 'Alicia Martinez', secteur: 'architecte_interieur', ville: 'France', bio: 'Déco & DIY', abonnes: null, email: null },
  { handle: '@legrenierdetom', nom: 'Tom - Déco Coiffure Lifestyle DIY', secteur: 'architecte_interieur', ville: 'France', bio: 'Déco | Coiffure | Lifestyle | DIY', abonnes: null, email: null },
  { handle: '@rachelstyliste', nom: 'Rachel Styliste mode & deco', secteur: 'architecte_interieur', ville: 'France', bio: 'Mode & Déco', abonnes: null, email: null },
  { handle: '@romaincosta_', nom: 'Romain Costa', secteur: 'architecte_interieur', ville: 'France', bio: 'Décoration & architecture intérieure', abonnes: null, email: null },
  { handle: '@juliettedecore', nom: 'Juliette Décore', secteur: 'architecte_interieur', ville: 'Paris', bio: 'Décoration intérieure Paris | Partenariat contact', abonnes: 12000, email: null },
  { handle: '@heju_paris', nom: 'Hélène & Julien - Heju', secteur: 'architecte_interieur', ville: 'Paris', bio: 'Architectes intérieur Paris | Collaborations', abonnes: 45000, email: null },
  { handle: '@chiara.deco', nom: 'Chiara Déco', secteur: 'architecte_interieur', ville: 'Paris', bio: 'Home decor | Paris | partenariat@gmail.com', abonnes: 15000, email: null },
  { handle: '@decorationinterieur.fr', nom: 'Décoration Intérieur France', secteur: 'architecte_interieur', ville: 'France', bio: 'Inspiration déco France', abonnes: 22000, email: null },
];

// ─── REQUÊTES BING PAR SECTEUR ────────────────────────────────────────────────
const BING_QUERIES = [
  { q: 'micro influenceuse esthéticienne paris instagram 10k 20k partenariat email', secteur: 'estheticienne' },
  { q: 'micro influenceur food blogger paris instagram 10k 20k partenariat collab', secteur: 'restaurant' },
  { q: 'micro influenceuse coiffure cheveux paris instagram partenariat email', secteur: 'salon_coiffure' },
  { q: 'micro influenceuse spa bien-être massage paris instagram partenariat email', secteur: 'spa' },
  { q: 'influenceuse spa hammam paris instagram collaboration email', secteur: 'spa' },
  { q: 'micro influenceuse médecine esthétique botox paris instagram partenariat email', secteur: 'clinique_esthetique' },
  { q: 'influenceuse skincare soins visage paris instagram collaboration email', secteur: 'clinique_esthetique' },
  { q: 'micro influenceuse décoration intérieur paris instagram partenariat email', secteur: 'architecte_interieur' },
  { q: 'influenceuse déco maison paris instagram collab email', secteur: 'architecte_interieur' },
  // Requêtes Twitter/X
  { q: 'twitter influenceuse estheticienne paris instagram partenariat contact email', secteur: 'estheticienne' },
  { q: 'twitter food blogger paris instagram partenariat email collab', secteur: 'restaurant' },
  { q: 'twitter influenceuse spa bien-être paris instagram partenariat', secteur: 'spa' },
  { q: 'twitter influenceuse decoration paris instagram partenariat collab', secteur: 'architecte_interieur' },
];

// ─── INSTANCES NITTER (fallback fetch simple) ─────────────────────────────────
const NITTER_INSTANCES = [
  'https://nitter.poast.org',
  'https://nitter.cz',
  'https://nitter.tux.pizza',
  'https://nitter.moomoo.me',
];

const NITTER_QUERIES = {
  estheticienne: 'influenceuse estheticienne paris instagram partenariat',
  restaurant: 'food blogger paris restaurant instagram partenariat',
  salon_coiffure: 'coiffeuse coiffeur paris instagram partenariat collab',
  spa: 'bien-être spa paris instagram partenariat',
  clinique_esthetique: 'esthetique medicale paris instagram partenariat',
  architecte_interieur: 'decoration interieur paris instagram influenceuse',
};

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function stripHtml(html) {
  return (html || '').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
}

function extractEmail(text) {
  if (!text) return null;
  const m = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  return m ? m[0].toLowerCase() : null;
}

const IG_BLACKLIST = new Set(['p', 'reel', 'reels', 'explore', 'popular', 'stories', 'tv',
  'accounts', 'direct', 'web', 'hashtag', 'about', 'legal', 'privacy', 'help',
  'facebook', 'twitter', 'youtube', 'tiktok', 'snapchat', 'linkedin', 'login',
  'register', 'home', 'search', 'en', 'fr', 'settings']);

function isValidHandle(h) {
  if (!h || h.length < 2 || h.length > 30) return false;
  if (IG_BLACKLIST.has(h.toLowerCase())) return false;
  if (/^\d+$/.test(h)) return false;
  return true;
}

function parseFollowers(text) {
  if (!text) return null;
  const t = text.replace(/\s/g, '');
  const patterns = [
    { re: /(\d+[.,]\d+)[kK]/, mult: 1000 },
    { re: /(\d+)[kK]/, mult: 1000 },
    { re: /(\d+[.,]\d+)[mM]/, mult: 1000000 },
    { re: /(\d+)[mM]/, mult: 1000000 },
    { re: /([\d,.]+)(?:followers|abonnés|suivis)/i, mult: 1 },
  ];
  for (const { re, mult } of patterns) {
    const m = t.match(re);
    if (m) {
      const raw = parseFloat(m[1].replace(',', '.'));
      return Math.round(raw * mult);
    }
  }
  return null;
}

function tarifEstime(abonnes) {
  if (!abonnes || abonnes < 10000) return 'gratuit/produit';
  if (abonnes <= 20000) return '50-150€';
  if (abonnes <= 50000) return '150-300€';
  return '300-600€';
}

function formatAbonnes(n) {
  if (!n) return null;
  if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

const VILLES = ['paris', 'lyon', 'bordeaux', 'nice', 'marseille', 'toulouse',
  'nantes', 'lille', 'strasbourg', 'france', 'idf', 'île-de-france'];

function detectVille(text) {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const v of VILLES) {
    if (t.includes(v)) return v.charAt(0).toUpperCase() + v.slice(1);
  }
  return null;
}

// ─── PARSER MODASH ───────────────────────────────────────────────────────────
// Modash structure (from real page analysis) :
//   "N. Nom Prénom"
//   "France"
//   "Bio avec email@example.com dedans"
//   "@handle"
//   "@handle"   (répété)
//   "Check contact details"
//   "Followers"
//   "XXXk"
//   ...
//   "Engagement rate" ...
//   "Audience location by city" ...
//   "Paris" ... "X%"
//   (puis profil suivant)
function parseModashText(text, secteur) {
  const profiles = [];
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Détecter le début d'un profil : "N. Nom Prénom" ou "N. NOM ..." (numérotation Modash)
    const profileStartMatch = line.match(/^(\d+)\.\s+(.+)$/);
    if (profileStartMatch) {
      const num = parseInt(profileStartMatch[1]);
      const nom = profileStartMatch[2].trim();

      let bio = '';
      let email = null;
      let igHandle = null;
      let abonnes = null;
      let ville = null;
      let j = i + 1;

      // Sauter "France" ou "United States" etc. juste après le nom
      if (j < lines.length && lines[j].match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/) && lines[j].length < 50) {
        j++;
      }

      // Lire la bio (jusqu'à "@handle")
      while (j < lines.length) {
        const l = lines[j];
        if (l.match(/^@([a-zA-Z0-9._]{2,30})$/)) break; // début des handles
        if (l === 'Check contact details' || l === 'Get audience breakdown' || l === 'Full Profile Data') break;
        if (l.match(/^(\d+)\.\s+.+$/)) break; // prochain profil
        bio += ' ' + l;
        const em = extractEmail(l);
        if (em) email = em;
        j++;
      }
      bio = bio.trim();

      // Lire les handles IG
      while (j < lines.length && lines[j].match(/^@([a-zA-Z0-9._]{2,30})$/)) {
        const m = lines[j].match(/^@([a-zA-Z0-9._]{2,30})$/);
        if (m && isValidHandle(m[1]) && !igHandle) {
          igHandle = '@' + m[1].toLowerCase();
        }
        j++;
      }

      // Sauter "Check contact details" etc.
      while (j < lines.length && ['Check contact details', 'Get audience breakdown', 'Full Profile Data'].includes(lines[j])) {
        j++;
      }

      // Lire les abonnés : "Followers\nXXXk"
      if (j < lines.length && lines[j] === 'Followers') {
        j++;
        if (j < lines.length) {
          abonnes = parseFollowers(lines[j] + ' followers');
          j++;
        }
      }

      // Chercher la ville dans "Audience location by city" section
      // Elle apparaît plus loin avec "Paris\nX%\n..."
      for (let k = j; k < Math.min(lines.length, j + 60); k++) {
        if (lines[k] === 'Audience location by city') {
          ville = detectVille(lines.slice(k + 1, k + 6).join(' '));
          break;
        }
      }

      if (igHandle) {
        profiles.push({
          instagram_handle: igHandle,
          twitter_handle: null,
          nom: nom,
          bio: bio.slice(0, 300) || null,
          ville: ville || detectVille(bio) || null,
          abonnes_instagram: abonnes,
          email_contact: email,
          secteur,
          source: 'modash',
        });
      }

      i = j;
      continue;
    }

    i++;
  }

  // Déduplication (garder le profil avec le plus d'infos)
  const seen = new Map();
  for (const p of profiles) {
    const key = (p.instagram_handle || '').toLowerCase().replace(/[^a-z0-9._]/g, '');
    if (!key) continue;
    if (!seen.has(key) || (p.email_contact && !seen.get(key).email_contact)) {
      seen.set(key, p);
    }
  }

  return [...seen.values()];
}

// ─── PARSER BING RÉSULTATS ────────────────────────────────────────────────────
function parseBingResults(results, secteur) {
  const profiles = [];

  for (const r of results) {
    const fullText = `${r.href} ${r.title} ${r.snippet}`;

    // Handle Instagram depuis l'URL ou le texte
    const igFromUrl = fullText.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})(?:\/|$|\?|"|'|\s)/i);
    const igFromText = fullText.match(/(?:instagram|insta|ig)\s*:?\s*@?([a-zA-Z0-9._]{2,30})/i);
    const atMention = fullText.match(/@([a-zA-Z0-9._]{2,30})/);

    let igHandle = null;
    if (igFromUrl && isValidHandle(igFromUrl[1])) igHandle = '@' + igFromUrl[1].toLowerCase();
    else if (igFromText && isValidHandle(igFromText[1])) igHandle = '@' + igFromText[1].toLowerCase();
    else if (atMention && isValidHandle(atMention[1])) igHandle = '@' + atMention[1].toLowerCase();

    // Handle Twitter depuis l'URL
    const twFromUrl = fullText.match(/(?:twitter|x)\.com\/([a-zA-Z0-9_]{2,50})(?:\/|$|\?|"|'|\s)/i);
    let twitterHandle = null;
    if (twFromUrl && isValidHandle(twFromUrl[1])) twitterHandle = '@' + twFromUrl[1].toLowerCase();

    if (!igHandle && !twitterHandle) continue;

    const email = extractEmail(fullText);
    const abonnes = parseFollowers(fullText);
    const ville = detectVille(fullText);

    profiles.push({
      instagram_handle: igHandle,
      twitter_handle: twitterHandle,
      nom: r.title ? r.title.split('(')[0].split('|')[0].split('•')[0].split('-')[0].trim() : null,
      bio: r.snippet ? r.snippet.slice(0, 300) : null,
      ville: ville || 'Paris',
      abonnes_instagram: abonnes,
      email_contact: email,
      secteur,
      source: 'bing',
    });
  }

  return profiles;
}

// ─── SCRAPE BING ─────────────────────────────────────────────────────────────
async function scrapeBing(page, query) {
  const url = `https://www.bing.com/search?q=${encodeURIComponent(query)}&setlang=fr&cc=fr&count=20`;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 25000 });

    const results = await page.evaluate(() => {
      const items = [];
      document.querySelectorAll('.b_algo').forEach(el => {
        const a = el.querySelector('h2 a') || el.querySelector('a');
        const cite = el.querySelector('cite');
        const p = el.querySelector('.b_caption p, .b_lineclamp2, p');
        items.push({
          href: a?.href || '',
          title: a?.textContent?.trim() || '',
          cite: cite?.textContent?.trim() || '',
          snippet: p?.textContent?.trim() || '',
        });
      });
      return items;
    });

    return results;
  } catch (e) {
    console.log(`    Erreur Bing: ${e.message}`);
    return [];
  }
}

// ─── SCRAPE MODASH ────────────────────────────────────────────────────────────
async function scrapeModash(page, url, secteur) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 35000 });
    await sleep(1500);

    const text = await page.evaluate(() => document.body?.innerText || '');
    if (text.length < 100) return [];

    // Extraire les emails directement depuis le HTML
    const html = await page.content();
    const emailMatches = [...html.matchAll(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/g)].map(m => m[0].toLowerCase());

    const profiles = parseModashText(text, secteur);
    return profiles;
  } catch (e) {
    console.log(`    Erreur Modash (${url}): ${e.message}`);
    return [];
  }
}

// ─── SCRAPE PAGE DE CLASSEMENT ────────────────────────────────────────────────
async function scrapeRankingPage(page, url, secteur) {
  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 30000 });
    await sleep(1000);

    const html = await page.content();
    const text = await page.evaluate(() => document.body?.innerText || '');

    const profiles = [];
    const igRe = /instagram\.com\/([a-zA-Z0-9._]{2,30})(?:\/|"|'|\s|>)/gi;
    let m;

    while ((m = igRe.exec(html)) !== null) {
      const handle = m[1];
      if (!isValidHandle(handle)) continue;

      const start = Math.max(0, m.index - 200);
      const end = Math.min(html.length, m.index + 300);
      const context = stripHtml(html.slice(start, end));
      const email = extractEmail(context);
      const abonnes = parseFollowers(context);

      profiles.push({
        instagram_handle: '@' + handle.toLowerCase(),
        twitter_handle: null,
        nom: null,
        bio: context.slice(0, 200),
        ville: detectVille(context) || 'Paris',
        abonnes_instagram: abonnes,
        email_contact: email,
        secteur,
        source: 'ranking_page',
      });
    }

    return profiles;
  } catch (e) {
    console.log(`    Erreur ranking page (${url}): ${e.message}`);
    return [];
  }
}

// ─── APPROCHE NITTER (fetch simple) ──────────────────────────────────────────
async function tryNitter() {
  const results = [];

  for (const instance of NITTER_INSTANCES) {
    let instanceWorked = false;

    // Tester l'instance
    try {
      const res = await fetch(`${instance}/`, {
        headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
        signal: AbortSignal.timeout(8000),
      });
      const text = await res.text();
      if (res.status !== 200 || text.length < 500 || text.includes('Rate limit')) {
        console.log(`    Nitter ${instance}: indisponible (${res.status})`);
        continue;
      }
      console.log(`    Nitter ${instance}: disponible`);
      instanceWorked = true;
    } catch {
      console.log(`    Nitter ${instance}: timeout`);
      continue;
    }

    if (!instanceWorked) continue;

    for (const [secteur, query] of Object.entries(NITTER_QUERIES)) {
      const url = `${instance}/search?q=${encodeURIComponent(query)}&f=users`;
      try {
        const res = await fetch(url, {
          headers: { 'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 Chrome/120 Safari/537.36' },
          signal: AbortSignal.timeout(12000),
        });
        const html = await res.text();

        if (html.length < 200) continue;

        // Parser le HTML Nitter
        const usernameRe = /href="\/([a-zA-Z0-9_]{2,50})"[^>]*class="[^"]*username[^"]*"/g;
        const bioRe = /<p[^>]*class="[^"]*bio[^"]*"[^>]*>([\s\S]*?)<\/p>/g;
        const locRe = /<span[^>]*class="[^"]*location[^"]*"[^>]*>([\s\S]*?)<\/span>/g;

        const usernames = [];
        const bios = [];
        const locations = [];
        let m;

        while ((m = usernameRe.exec(html)) !== null) {
          const u = m[1];
          if (!['search', 'login', 'register', 'about', 'settings', 'hashtag'].includes(u.toLowerCase())) {
            usernames.push(u);
          }
        }
        while ((m = bioRe.exec(html)) !== null) bios.push(stripHtml(m[1]));
        while ((m = locRe.exec(html)) !== null) locations.push(stripHtml(m[1]));

        for (let i = 0; i < usernames.length; i++) {
          const bio = bios[i] || '';
          const location = locations[i] || '';
          const fullText = bio + ' ' + location;
          const email = extractEmail(fullText);
          const ville = detectVille(fullText);

          // Cherche handle Instagram dans la bio
          const igMatch = fullText.match(/(?:instagram|insta|ig)\.com\/([a-zA-Z0-9._]{2,30})/i) ||
                          fullText.match(/(?:instagram|insta|ig)\s*:?\s*@([a-zA-Z0-9._]{2,30})/i);
          const igHandle = igMatch && isValidHandle(igMatch[1]) ? '@' + igMatch[1].toLowerCase() : null;

          results.push({
            instagram_handle: igHandle,
            twitter_handle: '@' + usernames[i],
            nom: null,
            bio: bio.slice(0, 300),
            ville,
            abonnes_instagram: null,
            email_contact: email,
            secteur,
            source: 'nitter',
          });
        }

        await sleep(1500);
      } catch (e) {
        console.log(`    Nitter search error: ${e.message}`);
      }
    }

    break; // Une instance qui marche suffit
  }

  return results;
}

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== SCRAPER TWITTER/X + MODASH + BING — MICRO-INFLUENCEURS — CopyCraft ===\n');
  console.log(`Critères: ${MIN_FOLLOWERS.toLocaleString()}-${MAX_FOLLOWERS.toLocaleString()} abonnés, villes FR\n`);

  const allRaw = [];

  const browser = await puppeteer.launch({
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-infobars',
    ],
  });

  // Helper : crée une page fraîche pour chaque requête (évite "Execution context destroyed")
  async function newPage() {
    const p = await browser.newPage();
    await p.setUserAgent('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36');
    await p.setExtraHTTPHeaders({ 'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.8' });
    return p;
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SOURCE 1 : MODASH — listes publiques par secteur + ville
  // ══════════════════════════════════════════════════════════════════════════
  console.log('── SOURCE 1 : Modash (listes publiques) ─────────────────────────\n');

  for (const { url, secteur } of MODASH_PAGES) {
    console.log(`  [${secteur.toUpperCase()}] ${url}`);
    const page = await newPage();
    const profiles = await scrapeModash(page, url, secteur);
    await page.close();
    console.log(`    → ${profiles.length} profils extraits`);
    allRaw.push(...profiles);
    await sleep(SLEEP_MS + Math.random() * 1000);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SOURCE 2 : BING — recherche d'influenceurs Twitter/Instagram
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── SOURCE 2 : Bing Search ───────────────────────────────────────\n');

  for (const { q, secteur } of BING_QUERIES) {
    console.log(`  [${secteur.toUpperCase()}] "${q.slice(0, 60)}..."`);
    const page = await newPage();
    const bingResults = await scrapeBing(page, q);
    await page.close();
    const profiles = parseBingResults(bingResults, secteur);
    console.log(`    → ${bingResults.length} résultats Bing → ${profiles.length} profils`);
    allRaw.push(...profiles);
    await sleep(SLEEP_MS + Math.random() * 500);
  }

  // ══════════════════════════════════════════════════════════════════════════
  // SOURCE 3 : PAGES DE CLASSEMENT FR
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── SOURCE 3 : Pages de classement influenceurs FR ───────────────\n');

  for (const { url, secteur } of RANKING_PAGES) {
    console.log(`  [${secteur.toUpperCase()}] ${url}`);
    const page = await newPage();
    const profiles = await scrapeRankingPage(page, url, secteur);
    await page.close();
    console.log(`    → ${profiles.length} profils extraits`);
    allRaw.push(...profiles);
    await sleep(SLEEP_MS);
  }

  await browser.close();

  // ══════════════════════════════════════════════════════════════════════════
  // SOURCE 5 : SEED DATA — Architecte intérieur / Déco (profils vérifiés)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── SOURCE 5 : Seed architecte_interieur ─────────────────────────\n');
  for (const s of SEED_ARCHITECTE) {
    allRaw.push({
      instagram_handle: s.handle,
      twitter_handle: null,
      nom: s.nom,
      bio: s.bio,
      ville: s.ville,
      abonnes_instagram: s.abonnes,
      email_contact: s.email,
      secteur: s.secteur,
      source: 'seed_architecte',
    });
  }
  console.log(`  → ${SEED_ARCHITECTE.length} profils seed architecte_interieur`);

  // ══════════════════════════════════════════════════════════════════════════
  // SOURCE 4 : NITTER (fetch simple — sans puppeteer)
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── SOURCE 4 : Nitter (fetch simple) ─────────────────────────────\n');
  const nitterResults = await tryNitter();
  console.log(`  → ${nitterResults.length} profils Nitter`);
  allRaw.push(...nitterResults);

  // ══════════════════════════════════════════════════════════════════════════
  // CONSOLIDATION + DÉDUPLICATION
  // ══════════════════════════════════════════════════════════════════════════
  console.log('\n── Consolidation & Déduplication ────────────────────────────────\n');
  console.log(`  Bruts collectés: ${allRaw.length}`);

  const consolidated = new Map();

  for (const r of allRaw) {
    // Clé = handle Instagram (prioritaire) ou twitter handle
    const igKey = r.instagram_handle
      ? r.instagram_handle.toLowerCase().replace(/[^a-z0-9._]/g, '')
      : null;
    const twKey = r.twitter_handle
      ? r.twitter_handle.toLowerCase().replace(/[^a-z0-9_]/g, '')
      : null;
    const key = igKey || twKey;

    if (!key) continue;

    if (consolidated.has(key)) {
      const ex = consolidated.get(key);
      // Enrichir l'existant
      if (!ex.instagram_handle && r.instagram_handle) ex.instagram_handle = r.instagram_handle;
      if (!ex.twitter_handle && r.twitter_handle) ex.twitter_handle = r.twitter_handle;
      if (!ex.email_contact && r.email_contact) ex.email_contact = r.email_contact;
      if (!ex.nom && r.nom) ex.nom = r.nom;
      if (!ex.bio && r.bio) ex.bio = r.bio;
      if (!ex.ville && r.ville) ex.ville = r.ville;
      if (!ex.abonnes_instagram && r.abonnes_instagram) ex.abonnes_instagram = r.abonnes_instagram;
      // Garder la source la plus fiable
      if (r.source === 'modash') ex.source = 'modash';
    } else {
      consolidated.set(key, { ...r });
    }
  }

  console.log(`  Après déduplication: ${consolidated.size}`);

  // ── Filtrage final ──
  const influenceurs = [...consolidated.values()]
    .filter(i => {
      // Doit avoir au moins un handle
      if (!i.instagram_handle && !i.twitter_handle) return false;
      // Exclure les handles de services/marques Modash eux-mêmes
      const h = (i.instagram_handle || i.twitter_handle || '').toLowerCase();
      if (['modash', 'reech', 'favikon', 'clickanalytic', 'influence4you'].some(s => h.includes(s))) return false;
      return true;
    })
    .map(i => ({
      instagram_handle: i.instagram_handle || null,
      twitter_handle: i.twitter_handle || null,
      nom: i.nom,
      bio: i.bio ? i.bio.slice(0, 300) : null,
      ville: i.ville || 'Paris',
      abonnes_instagram: i.abonnes_instagram,
      abonnes_affiche: formatAbonnes(i.abonnes_instagram),
      secteur: i.secteur,
      email_contact: i.email_contact,
      tarif_estime: tarifEstime(i.abonnes_instagram),
      statut: i.email_contact ? 'à_contacter' : (i.instagram_handle ? 'ig_trouvé' : 'à_enrichir'),
      dans_cible: i.abonnes_instagram
        ? i.abonnes_instagram >= MIN_FOLLOWERS && i.abonnes_instagram <= MAX_FOLLOWERS
        : null, // null = inconnu
      source: i.source || 'inconnu',
      date_contact: null,
      scraped_at: new Date().toISOString(),
    }))
    .sort((a, b) => {
      // Trier : dans cible + email en premier
      const aScore = (a.dans_cible ? 2 : 0) + (a.email_contact ? 1 : 0);
      const bScore = (b.dans_cible ? 2 : 0) + (b.email_contact ? 1 : 0);
      if (bScore !== aScore) return bScore - aScore;
      return a.secteur.localeCompare(b.secteur);
    });

  // ── Sauvegarde ──
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(influenceurs, null, 2), 'utf8');

  // ── Résumé ──
  const dansCible = influenceurs.filter(i => i.dans_cible === true);
  const inconnu = influenceurs.filter(i => i.dans_cible === null);
  const horsCible = influenceurs.filter(i => i.dans_cible === false);

  console.log('\n=== RÉSULTATS FINAUX ===\n');
  console.log(`Total profils              : ${influenceurs.length}`);
  console.log(`Dans cible (${MIN_FOLLOWERS/1000}k-${MAX_FOLLOWERS/1000}k)    : ${dansCible.length}`);
  console.log(`Nb abonnés inconnu         : ${inconnu.length}`);
  console.log(`Hors cible (trop gros)     : ${horsCible.length}`);
  console.log(`Avec email                 : ${influenceurs.filter(i => i.email_contact).length}`);
  console.log(`Avec handle Instagram      : ${influenceurs.filter(i => i.instagram_handle).length}`);
  console.log(`Avec handle Twitter        : ${influenceurs.filter(i => i.twitter_handle).length}`);
  console.log('');

  const parSecteur = {};
  for (const i of influenceurs) {
    if (!parSecteur[i.secteur]) parSecteur[i.secteur] = { total: 0, avecEmail: 0, avecIG: 0, dansCible: 0 };
    parSecteur[i.secteur].total++;
    if (i.email_contact) parSecteur[i.secteur].avecEmail++;
    if (i.instagram_handle) parSecteur[i.secteur].avecIG++;
    if (i.dans_cible) parSecteur[i.secteur].dansCible++;
  }

  console.log('Par secteur :');
  for (const [s, d] of Object.entries(parSecteur)) {
    console.log(`  ${s.padEnd(25)} ${String(d.total).padEnd(4)} total | ${d.avecIG} IG | ${d.avecEmail} email | ${d.dansCible} dans cible`);
  }

  if (influenceurs.length > 0) {
    console.log('\nTop profils (dans cible ou inconnu, avec email) :');
    const toShow = influenceurs.filter(i => i.email_contact || i.instagram_handle).slice(0, 40);
    for (const i of toShow) {
      const ig = (i.instagram_handle || '').padEnd(30);
      const tw = (i.twitter_handle || '').padEnd(20);
      const ab = i.abonnes_affiche ? String(i.abonnes_affiche).padEnd(7) : '?k     ';
      const cible = i.dans_cible === true ? '✓' : (i.dans_cible === null ? '?' : '✗');
      const em = i.email_contact ? `✉ ${i.email_contact}` : 'sans email';
      console.log(`  ${cible} IG:${ig} TW:${tw} ${ab} [${i.secteur}]  ${em}`);
    }
  }

  console.log(`\nSauvegardé: ${OUTPUT_FILE}`);
  console.log(`Total vrais profils trouvés: ${influenceurs.length}\n`);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
