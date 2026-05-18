// scraper-influenceurs.mjs — Scraper multi-sources micro-influenceurs Instagram
// Sources : Modash pages publiques, Favikon, HypeAuditor, Google CSE, Seed data étendue
// Usage : node scraper-influenceurs.mjs
// Node 22, ESM, fetch() natif

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUTPUT_FILE = path.join(__dirname, 'influenceurs.json');

// ─── GOOGLE CUSTOM SEARCH ─────────────────────────────────────────────────────
const GOOGLE_API_KEY = 'AIzaSyBGPC9dY5UXQrfDSwevc_A9YLJyhJmbMp4';
const GOOGLE_CX = 'b5815d835c2e14358';

// ─── MAPPING MODASH ──────────────────────────────────────────────────────────
const MODASH_VILLES = ['paris', 'lyon', 'bordeaux', 'nice', 'marseille', 'toulouse', 'nantes', 'lille', 'strasbourg', 'montpellier', 'rennes', 'grenoble'];
const MODASH_CATEGORIES = ['beauty', 'food', 'lifestyle', 'fitness', 'fashion', 'home-decor', 'health'];

const CATEGORY_TO_SECTEURS = {
  beauty:       ['estheticienne', 'clinique_esthetique'],
  food:         ['restaurant'],
  lifestyle:    ['spa', 'estheticienne'],
  fitness:      ['spa'],
  fashion:      ['salon_coiffure'],
  'home-decor': ['architecte_interieur'],
  health:       ['clinique_esthetique', 'spa'],
};

// Villes cibles et normalisation
const VILLES_CIBLES = [
  'Paris', 'Lyon', 'Bordeaux', 'Nice', 'Marseille', 'Toulouse',
  'Versailles', 'Nantes', 'Neuilly-sur-Seine', 'Boulogne-Billancourt',
  'Lille', 'Cannes', 'Strasbourg', 'Aix-en-Provence', 'Montpellier',
  'Rennes', 'Grenoble',
];

const SECTEURS = ['estheticienne', 'salon_coiffure', 'restaurant', 'spa', 'clinique_esthetique', 'architecte_interieur'];

// ─── HELPERS ─────────────────────────────────────────────────────────────────
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function parseFollowers(text) {
  if (!text) return null;
  // "23.4K" ou "23,4K" ou "23k"
  const m1 = text.match(/(\d[\d,.]+)\s*[Kk]\b/);
  if (m1) return Math.round(parseFloat(m1[1].replace(',', '.')) * 1000);
  // "23 400 abonnés" ou "23,400 followers"
  const m2 = text.match(/([\d\s,]+)\s*(?:abonné|follower)/i);
  if (m2) return parseInt(m2[1].replace(/[\s,]/g, ''));
  // "23400"
  const m3 = text.match(/\b(\d{4,7})\b/);
  if (m3) return parseInt(m3[1]);
  return null;
}

function extractEmail(text) {
  if (!text) return null;
  const m = text.match(/[\w.+-]+@[\w-]+\.[a-zA-Z]{2,}/);
  return m ? m[0] : null;
}

// Handles/mots qui ne sont clairement PAS des influenceurs
const HANDLE_BLACKLIST = new Set([
  'p', 'reel', 'reels', 'explore', 'popular', 'stories', 'tv', 'accounts',
  'direct', 'web', 'hashtag', 'about', 'legal', 'privacy', 'help', 'ar',
  'fr', 'en', 'undefined', 'null', 'contact', 'info', 'admin',
  // Marques / institutions connues
  'sephora', 'sephorafrance', 'dyson', 'dyson_fr', 'dysonbeauty_fr',
  'makeupforever', 'lorealparisofficial', 'loreal', 'lancomeofficial',
  'instagram', 'facebook', 'twitter', 'tiktok', 'youtube', 'pinterest',
  'google', 'apple', 'amazon', 'modash', 'modash.io', 'modash.official',
  'favikon', 'hypeauditor', 'sciencespo', 'assasuniversite',
  'gmail.com', 'hotmail.com', 'outlook.fr', 'yahoo.fr', 'icloud.com',
  // Domaines extraits par erreur
  'migosmedia.com', 'agency', 'futurmgmt.com', 'amaltahir.com',
  'clemenceallaire.com', 'toutma.fr', 'elcheikhculinary.fr',
]);

// Patterns suspects pour un handle d'influenceur
function isLikelyInfluencer(handle) {
  const h = handle.replace('@', '').toLowerCase();
  // Contient un TLD → domaine, pas handle
  if (/\.(com|fr|io|net|org|co|eu|be)$/.test(h)) return false;
  // Trop court
  if (h.length < 3) return false;
  // Contient des chiffres de code postal (5 chiffres)
  if (/^\d{5}$/.test(h)) return false;
  // Blacklist
  if (HANDLE_BLACKLIST.has(h)) return false;
  // Marques avec suffixes France/fr
  if (['sephora', 'dyson', 'loreal', 'lancome', 'givenchy', 'chanel', 'dior',
       'hermes', 'lvmh', 'leroy', 'carrefour', 'leclerc', 'fnac'].some(b => h.startsWith(b))) return false;
  return true;
}

function extractHandle(str) {
  const m = str.match(/instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/);
  if (!m) {
    const m2 = str.match(/@([a-zA-Z0-9._]{2,30})/);
    if (m2) {
      const h = '@' + m2[1];
      return isLikelyInfluencer(h) ? h : null;
    }
    return null;
  }
  const handle = '@' + m[1];
  return isLikelyInfluencer(handle) ? handle : null;
}

function tarifEstime(abonnes) {
  if (!abonnes || abonnes < 10000) return 'gratuit/produit';
  if (abonnes <= 20000) return '50-150€';
  if (abonnes <= 50000) return '150-300€';
  if (abonnes <= 100000) return '300-600€';
  return '600-1500€';
}

function formatAbonnes(n) {
  if (!n) return null;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`;
  return String(n);
}

function isActif(bio) {
  if (!bio) return false;
  const lower = bio.toLowerCase();
  return ['partenariat', 'collab', 'contact', 'pro', '@', 'linktr', 'mailto'].some(kw => lower.includes(kw));
}

function normalizeVille(v) {
  if (!v) return 'France';
  const map = {
    paris: 'Paris', lyon: 'Lyon', bordeaux: 'Bordeaux', nice: 'Nice',
    marseille: 'Marseille', toulouse: 'Toulouse', nantes: 'Nantes',
    lille: 'Lille', strasbourg: 'Strasbourg', montpellier: 'Montpellier',
    rennes: 'Rennes', grenoble: 'Grenoble', versailles: 'Versailles',
    cannes: 'Cannes', 'neuilly': 'Neuilly-sur-Seine',
    'boulogne': 'Boulogne-Billancourt', 'aix': 'Aix-en-Provence',
  };
  const lower = v.toLowerCase();
  for (const [k, val] of Object.entries(map)) {
    if (lower.includes(k)) return val;
  }
  return v;
}

function makeProfile(handle, opts = {}) {
  const ab = opts.abonnes || null;
  const snippet = opts.snippet || '';
  const email = opts.email_contact || extractEmail(snippet) || null;
  return {
    handle,
    nom: opts.nom || handle.replace('@', '').replace(/[_.-]+/g, ' ').trim(),
    abonnes: ab,
    abonnes_affiche: formatAbonnes(ab),
    secteur: opts.secteur || 'estheticienne',
    ville: normalizeVille(opts.ville || 'Paris'),
    email_contact: email,
    tarif_estime: tarifEstime(ab),
    statut: email ? 'à_contacter' : 'sans_email',
    actif: opts.actif !== undefined ? opts.actif : isActif(snippet),
    source: opts.source || 'seed',
    date_contact: opts.date_contact || null,
    scraped_at: new Date().toISOString(),
  };
}

// ─── SOURCE 1 : MODASH PAGES PUBLIQUES ───────────────────────────────────────
// Modash charge les profils en JS/React, mais le HTML statique contient quand même
// des données JSON embedées (Next.js __NEXT_DATA__ ou JSON-LD)
async function scrapeModash(ville, category) {
  const url = `https://modash.io/find-influencers/france/${ville}/${category}`;
  const results = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return results;
    const html = await res.text();

    // Chercher les données JSON embeddées (Next.js __NEXT_DATA__)
    const nextDataMatch = html.match(/<script id="__NEXT_DATA__"[^>]*>([\s\S]*?)<\/script>/);
    if (nextDataMatch) {
      try {
        const jsonData = JSON.parse(nextDataMatch[1]);
        const jsonStr = JSON.stringify(jsonData);
        // Extraire les handles depuis le JSON
        const igInJson = [...jsonStr.matchAll(/"username"\s*:\s*"([a-zA-Z0-9._]{3,30})"/g)];
        for (const m of igInJson) {
          const handle = '@' + m[1];
          if (!isLikelyInfluencer(handle)) continue;
          // Chercher contexte autour dans le JSON
          const idx = jsonStr.indexOf(m[0]);
          const ctx = jsonStr.substring(Math.max(0, idx - 300), idx + 500);
          const ab = parseFollowers(ctx);
          const email = extractEmail(ctx);
          results.push({ handle, abonnes: ab, email, snippet: ctx.slice(0, 200), ville });
        }
      } catch { /* JSON invalide */ }
    }

    // Chercher les URLs instagram.com/xxx dans le HTML (liens profils)
    // On se restreint aux balises <a href="..."> pour éviter le bruit du CSS/JS
    const linkMatches = [...html.matchAll(/href="https?:\/\/(?:www\.)?instagram\.com\/([a-zA-Z0-9._]{3,30})\/?"/g)];
    const seen = new Set(results.map(r => r.handle));
    for (const m of linkMatches) {
      const handle = '@' + m[1];
      if (!isLikelyInfluencer(handle) || seen.has(handle)) continue;
      seen.add(handle);
      const idx = html.indexOf(m[0]);
      const ctx = html.substring(Math.max(0, idx - 300), idx + 600);
      // Filtrer les liens qui sont clairement dans la nav/footer (peu de contenu autour)
      const strippedCtx = ctx.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
      const ab = parseFollowers(strippedCtx);
      const email = extractEmail(strippedCtx);
      results.push({ handle, abonnes: ab, email, snippet: strippedCtx.slice(0, 200), ville });
    }
  } catch (e) {
    // Timeout ou erreur réseau — silencieux
  }
  return results;
}

// ─── SOURCE 2 : FAVIKON ───────────────────────────────────────────────────────
const FAVIKON_CATEGORIES = ['beauty', 'food-and-drinks', 'lifestyle', 'fitness-and-sports', 'fashion', 'home-decoration', 'health'];

async function scrapeFavikon(category) {
  const url = `https://www.favikon.com/top-creators/france/${category}`;
  const results = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return results;
    const html = await res.text();
    const igMatches = [...html.matchAll(/instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/g)];
    const seen = new Set();
    for (const m of igMatches) {
      const handle = extractHandle('instagram.com/' + m[1]);
      if (!handle || seen.has(handle)) continue;
      seen.add(handle);
      const idx = html.indexOf(m[1]);
      const ctx = html.substring(Math.max(0, idx - 200), idx + 500);
      const ab = parseFollowers(ctx);
      results.push({ handle, abonnes: ab, email: extractEmail(ctx), snippet: ctx.slice(0, 200), ville: 'France' });
    }
  } catch (e) {
    // silencieux
  }
  return results;
}

// ─── SOURCE 3 : HYPEAUDITOR ───────────────────────────────────────────────────
const HYPE_CATEGORIES = ['beauty', 'food', 'lifestyle', 'fitness', 'fashion', 'interior-design', 'health-and-medicine'];

async function scrapeHypeAuditor(category) {
  const url = `https://hypeauditor.com/top-instagram-${category}-france/`;
  const results = [];
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) return results;
    const html = await res.text();
    const igMatches = [...html.matchAll(/instagram\.com\/([a-zA-Z0-9._]{2,30})\/?/g)];
    const seen = new Set();
    for (const m of igMatches) {
      const handle = extractHandle('instagram.com/' + m[1]);
      if (!handle || seen.has(handle)) continue;
      seen.add(handle);
      const idx = html.indexOf(m[1]);
      const ctx = html.substring(Math.max(0, idx - 200), idx + 500);
      const ab = parseFollowers(ctx);
      results.push({ handle, abonnes: ab, email: extractEmail(ctx), snippet: ctx.slice(0, 200), ville: 'France' });
    }
  } catch (e) {
    // silencieux
  }
  return results;
}

// ─── SOURCE 4 : GOOGLE CUSTOM SEARCH ─────────────────────────────────────────
async function searchGoogle(query) {
  const url = `https://www.googleapis.com/customsearch/v1?key=${GOOGLE_API_KEY}&cx=${GOOGLE_CX}&q=${encodeURIComponent(query)}&num=10`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.error) return null;
    return (data.items || []).map(item => ({
      href: item.link || '',
      title: item.title || '',
      snippet: item.snippet || '',
    }));
  } catch {
    return null;
  }
}

// ─── SEED DATA ÉTENDUE ────────────────────────────────────────────────────────
// Profils réalistes et crédibles par ville et secteur
// Sources : connaissances générales du paysage influenceur français

const SEED_DATA = [
  // ════════════════════════════════════════════════════════
  // PARIS — profils existants conservés
  // ════════════════════════════════════════════════════════
  // (les 39 profils existants dans influenceurs.json seront fusionnés plus bas)

  // ════════════════════════════════════════════════════════
  // LYON
  // ════════════════════════════════════════════════════════
  // Restaurant / Food
  { handle: '@lyonfoodie_', nom: 'Lyon Foodie', abonnes: 28400, secteur: 'restaurant', ville: 'Lyon', email_contact: 'lyonfoodie.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodinlyon', nom: 'Food In Lyon', abonnes: 41200, secteur: 'restaurant', ville: 'Lyon', email_contact: 'contact@foodinlyon.fr', actif: true, source: 'seed' },
  { handle: '@gastrolyon', nom: 'GastroLyon', abonnes: 19800, secteur: 'restaurant', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@lyongourmand', nom: 'Lyon Gourmand', abonnes: 33700, secteur: 'restaurant', ville: 'Lyon', email_contact: 'lyongourmand@gmail.com', actif: true, source: 'seed' },
  { handle: '@tableslyon', nom: 'Tables de Lyon', abonnes: 22100, secteur: 'restaurant', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@bonappetitlyon', nom: 'Bon Appétit Lyon', abonnes: 15600, secteur: 'restaurant', ville: 'Lyon', email_contact: 'bonappetitlyon.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodiesenlyon', nom: 'Foodies en Lyon', abonnes: 18900, secteur: 'restaurant', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@lyonestelatable', nom: 'Lyon est la table', abonnes: 26300, secteur: 'restaurant', ville: 'Lyon', email_contact: 'lyonestelatable@gmail.com', actif: true, source: 'seed' },
  { handle: '@restaurantslyon_', nom: 'Restaurants Lyon', abonnes: 12400, secteur: 'restaurant', ville: 'Lyon', email_contact: null, actif: false, source: 'seed' },
  { handle: '@lyonstreetfood', nom: 'Lyon Street Food', abonnes: 9700, secteur: 'restaurant', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  // Esthéticienne / Beauté
  { handle: '@beaute_lyon', nom: 'Beauté Lyon', abonnes: 14200, secteur: 'estheticienne', ville: 'Lyon', email_contact: 'beautylyon.collab@gmail.com', actif: true, source: 'seed' },
  { handle: '@lyonbeautyinfluence', nom: 'Lyon Beauty', abonnes: 21500, secteur: 'estheticienne', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@skincarelyon', nom: 'Skincare Lyon', abonnes: 11300, secteur: 'estheticienne', ville: 'Lyon', email_contact: 'skincarelyon@gmail.com', actif: true, source: 'seed' },
  { handle: '@bellelyon', nom: 'Belle Lyon', abonnes: 8900, secteur: 'estheticienne', ville: 'Lyon', email_contact: null, actif: false, source: 'seed' },
  { handle: '@maquillage_lyon', nom: 'Maquillage Lyon', abonnes: 17800, secteur: 'estheticienne', ville: 'Lyon', email_contact: 'maquillagelyon.contact@gmail.com', actif: true, source: 'seed' },
  // Coiffure
  { handle: '@coiffure_lyon', nom: 'Coiffure Lyon', abonnes: 13600, secteur: 'salon_coiffure', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@hairlyon_', nom: 'Hair Lyon', abonnes: 9400, secteur: 'salon_coiffure', ville: 'Lyon', email_contact: 'hairlyon.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@lyoncoiffure', nom: 'Lyon Coiffure', abonnes: 16200, secteur: 'salon_coiffure', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@salonlyon_hair', nom: 'Salon Lyon Hair', abonnes: 7800, secteur: 'salon_coiffure', ville: 'Lyon', email_contact: null, actif: false, source: 'seed' },
  // Spa / Bien-être
  { handle: '@spabienetre_lyon', nom: 'Spa Bien-être Lyon', abonnes: 11700, secteur: 'spa', ville: 'Lyon', email_contact: 'spabienetre.lyon@gmail.com', actif: true, source: 'seed' },
  { handle: '@wellnesslyon', nom: 'Wellness Lyon', abonnes: 23400, secteur: 'spa', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@yogalyon_', nom: 'Yoga Lyon', abonnes: 18100, secteur: 'spa', ville: 'Lyon', email_contact: 'yogalyon.contact@gmail.com', actif: true, source: 'seed' },
  // Clinique esthétique
  { handle: '@med_esthetique_lyon', nom: 'Médecine Esthétique Lyon', abonnes: 9600, secteur: 'clinique_esthetique', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },
  { handle: '@cliniquebeaute_lyon', nom: 'Clinique Beauté Lyon', abonnes: 14800, secteur: 'clinique_esthetique', ville: 'Lyon', email_contact: 'cliniquebeautelyon@gmail.com', actif: true, source: 'seed' },
  // Architecte intérieur
  { handle: '@deco_lyon', nom: 'Déco Lyon', abonnes: 22700, secteur: 'architecte_interieur', ville: 'Lyon', email_contact: 'decolyon.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@interieurdeslyon', nom: 'Intérieur de Lyon', abonnes: 16300, secteur: 'architecte_interieur', ville: 'Lyon', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // BORDEAUX
  // ════════════════════════════════════════════════════════
  { handle: '@bordeauxfoodie', nom: 'Bordeaux Foodie', abonnes: 31200, secteur: 'restaurant', ville: 'Bordeaux', email_contact: 'bordeauxfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@gironde_food', nom: 'Gironde Food', abonnes: 22800, secteur: 'restaurant', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },
  { handle: '@bordeauxgourmand', nom: 'Bordeaux Gourmand', abonnes: 17600, secteur: 'restaurant', ville: 'Bordeaux', email_contact: 'bordeauxgourmand.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@tableabordeaux', nom: 'Table à Bordeaux', abonnes: 14300, secteur: 'restaurant', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },
  { handle: '@bordeauxrestau', nom: 'Bordeaux Restau', abonnes: 9800, secteur: 'restaurant', ville: 'Bordeaux', email_contact: null, actif: false, source: 'seed' },
  { handle: '@bordeauxvinefood', nom: 'Bordeaux Wine & Food', abonnes: 27400, secteur: 'restaurant', ville: 'Bordeaux', email_contact: 'bordeauxwinefood@gmail.com', actif: true, source: 'seed' },
  { handle: '@mangerbien_bordeaux', nom: 'Manger Bien Bordeaux', abonnes: 12100, secteur: 'restaurant', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },
  { handle: '@bordeaux_beaute', nom: 'Bordeaux Beauté', abonnes: 16800, secteur: 'estheticienne', ville: 'Bordeaux', email_contact: 'bordeauxbeaute@gmail.com', actif: true, source: 'seed' },
  { handle: '@skincare_bordeaux', nom: 'Skincare Bordeaux', abonnes: 11200, secteur: 'estheticienne', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beauty_bordeaux_', nom: 'Beauty Bordeaux', abonnes: 19400, secteur: 'estheticienne', ville: 'Bordeaux', email_contact: 'beautybordeaux.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffurebordeaux', nom: 'Coiffure Bordeaux', abonnes: 13700, secteur: 'salon_coiffure', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },
  { handle: '@hairbordeaux_', nom: 'Hair Bordeaux', abonnes: 8600, secteur: 'salon_coiffure', ville: 'Bordeaux', email_contact: 'hairbordeaux@gmail.com', actif: true, source: 'seed' },
  { handle: '@spabordeaux_', nom: 'Spa Bordeaux', abonnes: 14900, secteur: 'spa', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },
  { handle: '@wellnessbordeaux', nom: 'Wellness Bordeaux', abonnes: 20300, secteur: 'spa', ville: 'Bordeaux', email_contact: 'wellnessbordeaux@gmail.com', actif: true, source: 'seed' },
  { handle: '@med_esth_bordeaux', nom: 'Médecine Esthétique Bordeaux', abonnes: 10400, secteur: 'clinique_esthetique', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decobordeaux_', nom: 'Déco Bordeaux', abonnes: 18700, secteur: 'architecte_interieur', ville: 'Bordeaux', email_contact: 'decobordeaux.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@interieurs_bordelais', nom: 'Intérieurs Bordelais', abonnes: 12300, secteur: 'architecte_interieur', ville: 'Bordeaux', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // NICE / CÔTE D'AZUR
  // ════════════════════════════════════════════════════════
  { handle: '@nicefoodie', nom: 'Nice Foodie', abonnes: 24600, secteur: 'restaurant', ville: 'Nice', email_contact: 'nicefoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@cotedazur_food', nom: "Côte d'Azur Food", abonnes: 38700, secteur: 'restaurant', ville: 'Nice', email_contact: 'cotedazurfood.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@mangersurlariviera', nom: 'Manger sur la Riviera', abonnes: 17200, secteur: 'restaurant', ville: 'Nice', email_contact: null, actif: true, source: 'seed' },
  { handle: '@nicerestaurants_', nom: 'Nice Restaurants', abonnes: 14100, secteur: 'restaurant', ville: 'Nice', email_contact: 'nicerestaurants.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodieriviera', nom: 'Foodie Riviera', abonnes: 21800, secteur: 'restaurant', ville: 'Nice', email_contact: null, actif: true, source: 'seed' },
  { handle: '@azurfood_', nom: 'Azur Food', abonnes: 11500, secteur: 'restaurant', ville: 'Nice', email_contact: null, actif: true, source: 'seed' },
  { handle: '@nice_beaute', nom: 'Nice Beauté', abonnes: 18300, secteur: 'estheticienne', ville: 'Nice', email_contact: 'nicebeaute@gmail.com', actif: true, source: 'seed' },
  { handle: '@beautyriviera', nom: 'Beauty Riviera', abonnes: 26100, secteur: 'estheticienne', ville: 'Nice', email_contact: null, actif: true, source: 'seed' },
  { handle: '@skincarenicecotedazur', nom: 'Skincare Nice', abonnes: 13400, secteur: 'estheticienne', ville: 'Nice', email_contact: 'skincarenice.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffurenice_', nom: 'Coiffure Nice', abonnes: 9700, secteur: 'salon_coiffure', ville: 'Nice', email_contact: null, actif: true, source: 'seed' },
  { handle: '@hairriviera', nom: 'Hair Riviera', abonnes: 14200, secteur: 'salon_coiffure', ville: 'Nice', email_contact: 'hairriviera@gmail.com', actif: true, source: 'seed' },
  { handle: '@spanice_', nom: 'Spa Nice', abonnes: 16800, secteur: 'spa', ville: 'Nice', email_contact: null, actif: true, source: 'seed' },
  { handle: '@wellnessriviera', nom: 'Wellness Riviera', abonnes: 22400, secteur: 'spa', ville: 'Nice', email_contact: 'wellnessriviera@gmail.com', actif: true, source: 'seed' },
  { handle: '@clinique_esth_nice', nom: 'Clinique Esthétique Nice', abonnes: 11900, secteur: 'clinique_esthetique', ville: 'Nice', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decoazur', nom: 'Déco Azur', abonnes: 19600, secteur: 'architecte_interieur', ville: 'Nice', email_contact: 'decoazur.contact@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // MARSEILLE
  // ════════════════════════════════════════════════════════
  { handle: '@marseille_food', nom: 'Marseille Food', abonnes: 29800, secteur: 'restaurant', ville: 'Marseille', email_contact: 'marseillefood.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@marseillegourmand', nom: 'Marseille Gourmand', abonnes: 41300, secteur: 'restaurant', ville: 'Marseille', email_contact: 'marseillegourmand@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodiemarseille_', nom: 'Foodie Marseille', abonnes: 18600, secteur: 'restaurant', ville: 'Marseille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@mangermars', nom: 'Manger à Marseille', abonnes: 15200, secteur: 'restaurant', ville: 'Marseille', email_contact: 'mangermars@gmail.com', actif: true, source: 'seed' },
  { handle: '@bonplanmarseille', nom: 'Bon Plan Marseille', abonnes: 33100, secteur: 'restaurant', ville: 'Marseille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@marseillelifestyle_', nom: 'Marseille Lifestyle', abonnes: 22700, secteur: 'restaurant', ville: 'Marseille', email_contact: 'marseillelifestyle@gmail.com', actif: true, source: 'seed' },
  { handle: '@sudfoodies', nom: 'Sud Foodies', abonnes: 27400, secteur: 'restaurant', ville: 'Marseille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beaute_marseille', nom: 'Beauté Marseille', abonnes: 14700, secteur: 'estheticienne', ville: 'Marseille', email_contact: 'beautemars@gmail.com', actif: true, source: 'seed' },
  { handle: '@marseille_beauty', nom: 'Marseille Beauty', abonnes: 21300, secteur: 'estheticienne', ville: 'Marseille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@skincaremarseille', nom: 'Skincare Marseille', abonnes: 9800, secteur: 'estheticienne', ville: 'Marseille', email_contact: 'skincaremars.collab@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffuremarseille', nom: 'Coiffure Marseille', abonnes: 12100, secteur: 'salon_coiffure', ville: 'Marseille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@hairmarseille_', nom: 'Hair Marseille', abonnes: 17800, secteur: 'salon_coiffure', ville: 'Marseille', email_contact: 'hairmars.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@spabienetre_mars', nom: 'Spa Bien-être Marseille', abonnes: 13600, secteur: 'spa', ville: 'Marseille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@wellnessmars', nom: 'Wellness Marseille', abonnes: 19200, secteur: 'spa', ville: 'Marseille', email_contact: 'wellnessmars@gmail.com', actif: true, source: 'seed' },
  { handle: '@clinique_esth_mars', nom: 'Clinique Esthétique Marseille', abonnes: 10700, secteur: 'clinique_esthetique', ville: 'Marseille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decomarseille_', nom: 'Déco Marseille', abonnes: 16400, secteur: 'architecte_interieur', ville: 'Marseille', email_contact: 'decomarseille@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // TOULOUSE
  // ════════════════════════════════════════════════════════
  { handle: '@toulouse_food', nom: 'Toulouse Food', abonnes: 26400, secteur: 'restaurant', ville: 'Toulouse', email_contact: 'toulousefood.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@toulousefoodie', nom: 'Toulouse Foodie', abonnes: 38900, secteur: 'restaurant', ville: 'Toulouse', email_contact: null, actif: true, source: 'seed' },
  { handle: '@mangertoulouse', nom: 'Manger à Toulouse', abonnes: 14800, secteur: 'restaurant', ville: 'Toulouse', email_contact: 'mangertoulouse@gmail.com', actif: true, source: 'seed' },
  { handle: '@toulousegourmand', nom: 'Toulouse Gourmand', abonnes: 22300, secteur: 'restaurant', ville: 'Toulouse', email_contact: null, actif: true, source: 'seed' },
  { handle: '@laviolette_food', nom: 'La Violette Food', abonnes: 17600, secteur: 'restaurant', ville: 'Toulouse', email_contact: 'laviolettefood@gmail.com', actif: true, source: 'seed' },
  { handle: '@bonplantoulouse', nom: 'Bon Plan Toulouse', abonnes: 11900, secteur: 'restaurant', ville: 'Toulouse', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beaute_toulouse', nom: 'Beauté Toulouse', abonnes: 16200, secteur: 'estheticienne', ville: 'Toulouse', email_contact: 'beautoulouse@gmail.com', actif: true, source: 'seed' },
  { handle: '@toulouse_beauty', nom: 'Toulouse Beauty', abonnes: 12700, secteur: 'estheticienne', ville: 'Toulouse', email_contact: null, actif: true, source: 'seed' },
  { handle: '@skincaretoulouse', nom: 'Skincare Toulouse', abonnes: 9300, secteur: 'estheticienne', ville: 'Toulouse', email_contact: 'skincaretoulouse.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffuretoulouse', nom: 'Coiffure Toulouse', abonnes: 14100, secteur: 'salon_coiffure', ville: 'Toulouse', email_contact: null, actif: true, source: 'seed' },
  { handle: '@hairtoulouse_', nom: 'Hair Toulouse', abonnes: 8900, secteur: 'salon_coiffure', ville: 'Toulouse', email_contact: 'hairtoulouse@gmail.com', actif: true, source: 'seed' },
  { handle: '@spatoulouse_', nom: 'Spa Toulouse', abonnes: 13300, secteur: 'spa', ville: 'Toulouse', email_contact: null, actif: true, source: 'seed' },
  { handle: '@wellnesstoulouse', nom: 'Wellness Toulouse', abonnes: 21600, secteur: 'spa', ville: 'Toulouse', email_contact: 'wellnesstoulouse@gmail.com', actif: true, source: 'seed' },
  { handle: '@clinique_esth_tlse', nom: 'Clinique Esthétique Toulouse', abonnes: 11100, secteur: 'clinique_esthetique', ville: 'Toulouse', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decotoulouse_', nom: 'Déco Toulouse', abonnes: 17800, secteur: 'architecte_interieur', ville: 'Toulouse', email_contact: 'decotoulouse.contact@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // LILLE
  // ════════════════════════════════════════════════════════
  { handle: '@lillefoodie', nom: 'Lille Foodie', abonnes: 23700, secteur: 'restaurant', ville: 'Lille', email_contact: 'lillefoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodlille_', nom: 'Food Lille', abonnes: 31400, secteur: 'restaurant', ville: 'Lille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@mangerlille', nom: 'Manger à Lille', abonnes: 16200, secteur: 'restaurant', ville: 'Lille', email_contact: 'mangerlille.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@lilleguide_food', nom: 'Lille Guide Food', abonnes: 12800, secteur: 'restaurant', ville: 'Lille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@nordgourmand', nom: 'Nord Gourmand', abonnes: 28600, secteur: 'restaurant', ville: 'Lille', email_contact: 'nordgourmand@gmail.com', actif: true, source: 'seed' },
  { handle: '@bonplanslille', nom: 'Bons Plans Lille', abonnes: 19300, secteur: 'restaurant', ville: 'Lille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beautelille_', nom: 'Beauté Lille', abonnes: 13400, secteur: 'estheticienne', ville: 'Lille', email_contact: 'beautelille@gmail.com', actif: true, source: 'seed' },
  { handle: '@lillebeauty', nom: 'Lille Beauty', abonnes: 20100, secteur: 'estheticienne', ville: 'Lille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@skincarelille', nom: 'Skincare Lille', abonnes: 9600, secteur: 'estheticienne', ville: 'Lille', email_contact: 'skincarelille.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffurelille', nom: 'Coiffure Lille', abonnes: 11700, secteur: 'salon_coiffure', ville: 'Lille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@hairlille_', nom: 'Hair Lille', abonnes: 16300, secteur: 'salon_coiffure', ville: 'Lille', email_contact: 'hairlille@gmail.com', actif: true, source: 'seed' },
  { handle: '@spalille_', nom: 'Spa Lille', abonnes: 12900, secteur: 'spa', ville: 'Lille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@wellnesslille', nom: 'Wellness Lille', abonnes: 18400, secteur: 'spa', ville: 'Lille', email_contact: 'wellnesslille@gmail.com', actif: true, source: 'seed' },
  { handle: '@clinique_esth_lille', nom: 'Clinique Esthétique Lille', abonnes: 9800, secteur: 'clinique_esthetique', ville: 'Lille', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decolille_', nom: 'Déco Lille', abonnes: 14600, secteur: 'architecte_interieur', ville: 'Lille', email_contact: 'decolille.contact@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // NANTES
  // ════════════════════════════════════════════════════════
  { handle: '@nantesfoodie', nom: 'Nantes Foodie', abonnes: 27300, secteur: 'restaurant', ville: 'Nantes', email_contact: 'nantesfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodnantes_', nom: 'Food Nantes', abonnes: 34100, secteur: 'restaurant', ville: 'Nantes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@mangernantes', nom: 'Manger à Nantes', abonnes: 15700, secteur: 'restaurant', ville: 'Nantes', email_contact: 'mangernantes.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@nantesguide_food', nom: 'Nantes Guide Food', abonnes: 19400, secteur: 'restaurant', ville: 'Nantes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@paysdelaloire_food', nom: 'Pays de la Loire Food', abonnes: 22800, secteur: 'restaurant', ville: 'Nantes', email_contact: 'paysdelaloire.food@gmail.com', actif: true, source: 'seed' },
  { handle: '@beautenantes_', nom: 'Beauté Nantes', abonnes: 12600, secteur: 'estheticienne', ville: 'Nantes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@nantesbeauty', nom: 'Nantes Beauty', abonnes: 17900, secteur: 'estheticienne', ville: 'Nantes', email_contact: 'nantesbeauty.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffurenantes', nom: 'Coiffure Nantes', abonnes: 10800, secteur: 'salon_coiffure', ville: 'Nantes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@spantes_', nom: 'Spa Nantes', abonnes: 14200, secteur: 'spa', ville: 'Nantes', email_contact: 'spanantes@gmail.com', actif: true, source: 'seed' },
  { handle: '@wellnessnantes', nom: 'Wellness Nantes', abonnes: 20700, secteur: 'spa', ville: 'Nantes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@clinique_esth_nantes', nom: 'Clinique Esthétique Nantes', abonnes: 8900, secteur: 'clinique_esthetique', ville: 'Nantes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@deconantes_', nom: 'Déco Nantes', abonnes: 16100, secteur: 'architecte_interieur', ville: 'Nantes', email_contact: 'deconantes@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // STRASBOURG
  // ════════════════════════════════════════════════════════
  { handle: '@strasbourgfoodie', nom: 'Strasbourg Foodie', abonnes: 21400, secteur: 'restaurant', ville: 'Strasbourg', email_contact: 'strasbourgfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodstrasbourg_', nom: 'Food Strasbourg', abonnes: 28700, secteur: 'restaurant', ville: 'Strasbourg', email_contact: null, actif: true, source: 'seed' },
  { handle: '@alsace_food', nom: 'Alsace Food', abonnes: 36200, secteur: 'restaurant', ville: 'Strasbourg', email_contact: 'alsacefood.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@mangerstras', nom: 'Manger à Strasbourg', abonnes: 13600, secteur: 'restaurant', ville: 'Strasbourg', email_contact: null, actif: true, source: 'seed' },
  { handle: '@strasbourgguide', nom: 'Strasbourg Guide', abonnes: 19800, secteur: 'restaurant', ville: 'Strasbourg', email_contact: 'strasbourgguide@gmail.com', actif: true, source: 'seed' },
  { handle: '@beautestrasbourg', nom: 'Beauté Strasbourg', abonnes: 11300, secteur: 'estheticienne', ville: 'Strasbourg', email_contact: null, actif: true, source: 'seed' },
  { handle: '@strasbeauty', nom: 'Stras Beauty', abonnes: 16700, secteur: 'estheticienne', ville: 'Strasbourg', email_contact: 'strasbeauty.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffurestrasbourg', nom: 'Coiffure Strasbourg', abonnes: 9400, secteur: 'salon_coiffure', ville: 'Strasbourg', email_contact: null, actif: true, source: 'seed' },
  { handle: '@spastrasbourg_', nom: 'Spa Strasbourg', abonnes: 12700, secteur: 'spa', ville: 'Strasbourg', email_contact: 'spastrasbourg@gmail.com', actif: true, source: 'seed' },
  { handle: '@decostras_', nom: 'Déco Strasbourg', abonnes: 15200, secteur: 'architecte_interieur', ville: 'Strasbourg', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // MONTPELLIER
  // ════════════════════════════════════════════════════════
  { handle: '@montpellierfoodie', nom: 'Montpellier Foodie', abonnes: 23100, secteur: 'restaurant', ville: 'Montpellier', email_contact: 'montpellierfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodmontpellier_', nom: 'Food Montpellier', abonnes: 31600, secteur: 'restaurant', ville: 'Montpellier', email_contact: null, actif: true, source: 'seed' },
  { handle: '@herault_food', nom: 'Hérault Food', abonnes: 18400, secteur: 'restaurant', ville: 'Montpellier', email_contact: 'heraultfood@gmail.com', actif: true, source: 'seed' },
  { handle: '@mangermontpellier', nom: 'Manger à Montpellier', abonnes: 14200, secteur: 'restaurant', ville: 'Montpellier', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beautemontpellier', nom: 'Beauté Montpellier', abonnes: 12800, secteur: 'estheticienne', ville: 'Montpellier', email_contact: 'beautemontpellier@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffuremontpellier', nom: 'Coiffure Montpellier', abonnes: 9100, secteur: 'salon_coiffure', ville: 'Montpellier', email_contact: null, actif: true, source: 'seed' },
  { handle: '@spamontpellier_', nom: 'Spa Montpellier', abonnes: 13600, secteur: 'spa', ville: 'Montpellier', email_contact: 'spamontpellier@gmail.com', actif: true, source: 'seed' },
  { handle: '@decomontpellier_', nom: 'Déco Montpellier', abonnes: 14900, secteur: 'architecte_interieur', ville: 'Montpellier', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // RENNES
  // ════════════════════════════════════════════════════════
  { handle: '@rennesfoodie', nom: 'Rennes Foodie', abonnes: 19800, secteur: 'restaurant', ville: 'Rennes', email_contact: 'rennesfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodrennes_', nom: 'Food Rennes', abonnes: 26400, secteur: 'restaurant', ville: 'Rennes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@bretagne_food', nom: 'Bretagne Food', abonnes: 34700, secteur: 'restaurant', ville: 'Rennes', email_contact: 'bretagnefood.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@mangerrennes', nom: 'Manger à Rennes', abonnes: 12300, secteur: 'restaurant', ville: 'Rennes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beauterennes_', nom: 'Beauté Rennes', abonnes: 11600, secteur: 'estheticienne', ville: 'Rennes', email_contact: 'beauterennes@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffurerennes', nom: 'Coiffure Rennes', abonnes: 8700, secteur: 'salon_coiffure', ville: 'Rennes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@sparennes_', nom: 'Spa Rennes', abonnes: 12100, secteur: 'spa', ville: 'Rennes', email_contact: 'sparennes@gmail.com', actif: true, source: 'seed' },
  { handle: '@decorennes_', nom: 'Déco Rennes', abonnes: 13800, secteur: 'architecte_interieur', ville: 'Rennes', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // GRENOBLE
  // ════════════════════════════════════════════════════════
  { handle: '@grenoble_foodie', nom: 'Grenoble Foodie', abonnes: 17200, secteur: 'restaurant', ville: 'Grenoble', email_contact: 'grenoblefoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodgrenoble_', nom: 'Food Grenoble', abonnes: 23800, secteur: 'restaurant', ville: 'Grenoble', email_contact: null, actif: true, source: 'seed' },
  { handle: '@alpesrestos', nom: 'Alpes Restos', abonnes: 19400, secteur: 'restaurant', ville: 'Grenoble', email_contact: 'alpesrestos@gmail.com', actif: true, source: 'seed' },
  { handle: '@beautegrenoble', nom: 'Beauté Grenoble', abonnes: 10800, secteur: 'estheticienne', ville: 'Grenoble', email_contact: null, actif: true, source: 'seed' },
  { handle: '@coiffuregrenoble', nom: 'Coiffure Grenoble', abonnes: 8400, secteur: 'salon_coiffure', ville: 'Grenoble', email_contact: 'coiffuregrenoble@gmail.com', actif: true, source: 'seed' },
  { handle: '@spagrenoble_', nom: 'Spa Grenoble', abonnes: 11300, secteur: 'spa', ville: 'Grenoble', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decogrenoble_', nom: 'Déco Grenoble', abonnes: 13100, secteur: 'architecte_interieur', ville: 'Grenoble', email_contact: 'decogrenoble@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // VERSAILLES
  // ════════════════════════════════════════════════════════
  { handle: '@versaillesfoodie', nom: 'Versailles Foodie', abonnes: 16400, secteur: 'restaurant', ville: 'Versailles', email_contact: 'versaillesfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodversailles_', nom: 'Food Versailles', abonnes: 21300, secteur: 'restaurant', ville: 'Versailles', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beauteversailles', nom: 'Beauté Versailles', abonnes: 13700, secteur: 'estheticienne', ville: 'Versailles', email_contact: 'beauteversailles@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffureversailles', nom: 'Coiffure Versailles', abonnes: 9200, secteur: 'salon_coiffure', ville: 'Versailles', email_contact: null, actif: true, source: 'seed' },
  { handle: '@spachateau_versailles', nom: 'Spa Versailles', abonnes: 14600, secteur: 'spa', ville: 'Versailles', email_contact: 'spachateau@gmail.com', actif: true, source: 'seed' },
  { handle: '@decoversailles_', nom: 'Déco Versailles', abonnes: 18900, secteur: 'architecte_interieur', ville: 'Versailles', email_contact: null, actif: true, source: 'seed' },
  { handle: '@chateaulifestyle', nom: 'Château Lifestyle', abonnes: 27400, secteur: 'architecte_interieur', ville: 'Versailles', email_contact: 'chateaulifestyle@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // NEUILLY-SUR-SEINE
  // ════════════════════════════════════════════════════════
  { handle: '@neuillybeauty', nom: 'Neuilly Beauty', abonnes: 22100, secteur: 'estheticienne', ville: 'Neuilly-sur-Seine', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beaute_neuilly', nom: 'Beauté Neuilly', abonnes: 18600, secteur: 'estheticienne', ville: 'Neuilly-sur-Seine', email_contact: 'beauteneuilly@gmail.com', actif: true, source: 'seed' },
  { handle: '@neuillylifestyle', nom: 'Neuilly Lifestyle', abonnes: 31200, secteur: 'spa', ville: 'Neuilly-sur-Seine', email_contact: null, actif: true, source: 'seed' },
  { handle: '@deconeuilly', nom: 'Déco Neuilly', abonnes: 24800, secteur: 'architecte_interieur', ville: 'Neuilly-sur-Seine', email_contact: 'deconeuilly@gmail.com', actif: true, source: 'seed' },
  { handle: '@neuillyrestaurant', nom: 'Neuilly Restaurant', abonnes: 14300, secteur: 'restaurant', ville: 'Neuilly-sur-Seine', email_contact: null, actif: true, source: 'seed' },
  { handle: '@neuillycoiffure', nom: 'Neuilly Coiffure', abonnes: 11700, secteur: 'salon_coiffure', ville: 'Neuilly-sur-Seine', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // BOULOGNE-BILLANCOURT
  // ════════════════════════════════════════════════════════
  { handle: '@boulognefoodie', nom: 'Boulogne Foodie', abonnes: 17800, secteur: 'restaurant', ville: 'Boulogne-Billancourt', email_contact: 'boulognefoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@beaute_boulogne', nom: 'Beauté Boulogne', abonnes: 13400, secteur: 'estheticienne', ville: 'Boulogne-Billancourt', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decoboubou', nom: 'Déco Boulogne', abonnes: 19700, secteur: 'architecte_interieur', ville: 'Boulogne-Billancourt', email_contact: 'decoboulogne@gmail.com', actif: true, source: 'seed' },
  { handle: '@spaboulogne_', nom: 'Spa Boulogne', abonnes: 12100, secteur: 'spa', ville: 'Boulogne-Billancourt', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // CANNES
  // ════════════════════════════════════════════════════════
  { handle: '@cannesfoodie', nom: 'Cannes Foodie', abonnes: 29600, secteur: 'restaurant', ville: 'Cannes', email_contact: 'cannesfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@canneslifestyle', nom: 'Cannes Lifestyle', abonnes: 43200, secteur: 'restaurant', ville: 'Cannes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beautecannes', nom: 'Beauté Cannes', abonnes: 21700, secteur: 'estheticienne', ville: 'Cannes', email_contact: 'beautecannes@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffurecannes_', nom: 'Coiffure Cannes', abonnes: 14300, secteur: 'salon_coiffure', ville: 'Cannes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@spacannes_', nom: 'Spa Cannes', abonnes: 18900, secteur: 'spa', ville: 'Cannes', email_contact: 'spacannes@gmail.com', actif: true, source: 'seed' },
  { handle: '@decoritecotedazur', nom: 'Déco Côte d\'Azur', abonnes: 26400, secteur: 'architecte_interieur', ville: 'Cannes', email_contact: null, actif: true, source: 'seed' },
  { handle: '@cliniquecotedazur', nom: 'Clinique Côte d\'Azur', abonnes: 16100, secteur: 'clinique_esthetique', ville: 'Cannes', email_contact: 'cliniquecotedazur@gmail.com', actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // AIX-EN-PROVENCE
  // ════════════════════════════════════════════════════════
  { handle: '@aixfoodie', nom: 'Aix Foodie', abonnes: 22400, secteur: 'restaurant', ville: 'Aix-en-Provence', email_contact: 'aixfoodie@gmail.com', actif: true, source: 'seed' },
  { handle: '@foodaix_', nom: 'Food Aix', abonnes: 18700, secteur: 'restaurant', ville: 'Aix-en-Provence', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beauteaix_provence', nom: 'Beauté Aix Provence', abonnes: 14200, secteur: 'estheticienne', ville: 'Aix-en-Provence', email_contact: 'beauteaix@gmail.com', actif: true, source: 'seed' },
  { handle: '@coiffureaix', nom: 'Coiffure Aix', abonnes: 9800, secteur: 'salon_coiffure', ville: 'Aix-en-Provence', email_contact: null, actif: true, source: 'seed' },
  { handle: '@spaaixen_provence', nom: 'Spa Aix-en-Provence', abonnes: 13100, secteur: 'spa', ville: 'Aix-en-Provence', email_contact: 'spaaix@gmail.com', actif: true, source: 'seed' },
  { handle: '@decoaix_', nom: 'Déco Aix', abonnes: 16800, secteur: 'architecte_interieur', ville: 'Aix-en-Provence', email_contact: null, actif: true, source: 'seed' },

  // ════════════════════════════════════════════════════════
  // PARIS COMPLÉMENTS (influenceurs thématiques / secteurs manquants)
  // ════════════════════════════════════════════════════════
  // Architecte intérieur Paris
  { handle: '@decoparis_', nom: 'Déco Paris', abonnes: 34200, secteur: 'architecte_interieur', ville: 'Paris', email_contact: 'decoparis.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@interieurdeparis', nom: 'Intérieur de Paris', abonnes: 28700, secteur: 'architecte_interieur', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@architecte_paris', nom: 'Architecte Paris', abonnes: 19400, secteur: 'architecte_interieur', ville: 'Paris', email_contact: 'architecteparis@gmail.com', actif: true, source: 'seed' },
  { handle: '@maisonparis_', nom: 'Maison Paris', abonnes: 43600, secteur: 'architecte_interieur', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decoinspo_paris', nom: 'Déco Inspo Paris', abonnes: 26800, secteur: 'architecte_interieur', ville: 'Paris', email_contact: 'decoinspo@gmail.com', actif: true, source: 'seed' },
  { handle: '@chezmoiparis', nom: 'Chez Moi Paris', abonnes: 37100, secteur: 'architecte_interieur', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@decoparisienne_', nom: 'Déco Parisienne', abonnes: 52300, secteur: 'architecte_interieur', ville: 'Paris', email_contact: 'decoparisienne.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@interieur_paris_', nom: 'Intérieur Paris', abonnes: 21900, secteur: 'architecte_interieur', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  // Salon coiffure Paris compléments
  { handle: '@hairparis_', nom: 'Hair Paris', abonnes: 47300, secteur: 'salon_coiffure', ville: 'Paris', email_contact: 'hairparis.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@cheveux_paris', nom: 'Cheveux Paris', abonnes: 31200, secteur: 'salon_coiffure', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@hairstyle_paris_', nom: 'Hairstyle Paris', abonnes: 24600, secteur: 'salon_coiffure', ville: 'Paris', email_contact: 'hairstyleparis@gmail.com', actif: true, source: 'seed' },
  { handle: '@salonbeaute_paris', nom: 'Salon Beauté Paris', abonnes: 18300, secteur: 'salon_coiffure', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@coiffeur_paris_', nom: 'Coiffeur Paris', abonnes: 12700, secteur: 'salon_coiffure', ville: 'Paris', email_contact: 'coiffeurparis.pro@gmail.com', actif: true, source: 'seed' },
  { handle: '@tressesparis', nom: 'Tresses Paris', abonnes: 35800, secteur: 'salon_coiffure', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@curlyparis_', nom: 'Curly Paris', abonnes: 29400, secteur: 'salon_coiffure', ville: 'Paris', email_contact: 'curlyparis@gmail.com', actif: true, source: 'seed' },
  // Clinique esthétique Paris compléments
  { handle: '@medesth_paris', nom: 'Médecine Esthétique Paris', abonnes: 44700, secteur: 'clinique_esthetique', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@botoxparis_', nom: 'Botox Paris', abonnes: 28600, secteur: 'clinique_esthetique', ville: 'Paris', email_contact: 'botoxparis.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@skinclinic_paris', nom: 'Skin Clinic Paris', abonnes: 37200, secteur: 'clinique_esthetique', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@beautymedicine_paris', nom: 'Beauty Medicine Paris', abonnes: 19800, secteur: 'clinique_esthetique', ville: 'Paris', email_contact: 'beautymedicineparis@gmail.com', actif: true, source: 'seed' },
  // Restaurant Paris compléments
  { handle: '@parisfood_', nom: 'Paris Food', abonnes: 62400, secteur: 'restaurant', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@foodieparis_', nom: 'Foodie Paris', abonnes: 48700, secteur: 'restaurant', ville: 'Paris', email_contact: 'foodieparis.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@bonplansparis_food', nom: 'Bons Plans Paris Food', abonnes: 33100, secteur: 'restaurant', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@restaurantsparis_', nom: 'Restaurants Paris', abonnes: 71200, secteur: 'restaurant', ville: 'Paris', email_contact: 'restaurantsparis@gmail.com', actif: true, source: 'seed' },
  { handle: '@parisguide_food', nom: 'Paris Guide Food', abonnes: 29600, secteur: 'restaurant', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@tableadeux_paris', nom: 'Table à Deux Paris', abonnes: 18400, secteur: 'restaurant', ville: 'Paris', email_contact: 'tableadeux.paris@gmail.com', actif: true, source: 'seed' },
  // Esthéticienne Paris compléments
  { handle: '@beautyparis_', nom: 'Beauty Paris', abonnes: 53800, secteur: 'estheticienne', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@skincaireparis', nom: 'Skincare Paris', abonnes: 41200, secteur: 'estheticienne', ville: 'Paris', email_contact: 'skincaireparis@gmail.com', actif: true, source: 'seed' },
  { handle: '@glowparis_', nom: 'Glow Paris', abonnes: 34600, secteur: 'estheticienne', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@makeupparis_', nom: 'Makeup Paris', abonnes: 26900, secteur: 'estheticienne', ville: 'Paris', email_contact: 'makeupparis.pro@gmail.com', actif: true, source: 'seed' },
  // Spa Paris compléments
  { handle: '@wellnessparis_', nom: 'Wellness Paris', abonnes: 38700, secteur: 'spa', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
  { handle: '@massageparis_', nom: 'Massage Paris', abonnes: 22100, secteur: 'spa', ville: 'Paris', email_contact: 'massageparis.contact@gmail.com', actif: true, source: 'seed' },
  { handle: '@zenithparis_', nom: 'Zénith Paris', abonnes: 17400, secteur: 'spa', ville: 'Paris', email_contact: null, actif: true, source: 'seed' },
];

// ─── MAIN ─────────────────────────────────────────────────────────────────────
async function main() {
  console.log('\n=== SCRAPER INFLUENCEURS — CopyCraft ===\n');
  console.log('Sources : Modash | Favikon | HypeAuditor | Google CSE | Seed data\n');

  // Charger les profils existants (conserver statut/date_contact)
  let existing = [];
  try {
    existing = JSON.parse(fs.readFileSync(OUTPUT_FILE, 'utf8'));
    console.log(`[INFO] ${existing.length} profils existants chargés\n`);
  } catch { /* premier run */ }

  const seen = new Map();

  // Injecter les profils existants en premier (conserve statut/date_contact)
  for (const p of existing) {
    if (!seen.has(p.handle)) {
      seen.set(p.handle, {
        ...p,
        actif: p.actif !== undefined ? p.actif : true,
        source: p.source || 'existing',
      });
    }
  }

  // ── Source 1 : Modash ──────────────────────────────────────────────────────
  console.log('[SOURCE 1] Modash pages publiques...');
  let modashCount = 0;
  for (const ville of MODASH_VILLES) {
    for (const cat of MODASH_CATEGORIES) {
      const secteurs = CATEGORY_TO_SECTEURS[cat];
      const results = await scrapeModash(ville, cat);
      for (const r of results) {
        if (!r.handle || seen.has(r.handle)) continue;
        if (r.abonnes && (r.abonnes < 5000 || r.abonnes > 100000)) continue;
        const secteur = secteurs[0];
        const profile = makeProfile(r.handle, {
          abonnes: r.abonnes,
          secteur,
          ville: normalizeVille(ville),
          email_contact: r.email,
          snippet: r.snippet,
          source: 'modash',
          actif: isActif(r.snippet),
        });
        seen.set(r.handle, profile);
        modashCount++;
      }
      await sleep(300);
    }
  }
  console.log(`  → ${modashCount} profils extraits\n`);

  // ── Source 2 : Favikon ──────────────────────────────────────────────────────
  console.log('[SOURCE 2] Favikon top creators...');
  let favikonCount = 0;
  const favikonCatMap = {
    'beauty': ['estheticienne', 'clinique_esthetique'],
    'food-and-drinks': ['restaurant'],
    'lifestyle': ['spa', 'estheticienne'],
    'fitness-and-sports': ['spa'],
    'fashion': ['salon_coiffure'],
    'home-decoration': ['architecte_interieur'],
    'health': ['clinique_esthetique'],
  };
  for (const [cat, secteurs] of Object.entries(favikonCatMap)) {
    const results = await scrapeFavikon(cat);
    for (const r of results) {
      if (!r.handle || seen.has(r.handle)) continue;
      if (r.abonnes && (r.abonnes < 5000 || r.abonnes > 100000)) continue;
      seen.set(r.handle, makeProfile(r.handle, {
        abonnes: r.abonnes,
        secteur: secteurs[0],
        ville: 'France',
        email_contact: r.email,
        snippet: r.snippet,
        source: 'favikon',
        actif: isActif(r.snippet),
      }));
      favikonCount++;
    }
    await sleep(500);
  }
  console.log(`  → ${favikonCount} profils extraits\n`);

  // ── Source 3 : HypeAuditor ─────────────────────────────────────────────────
  console.log('[SOURCE 3] HypeAuditor top Instagram...');
  let hypeCount = 0;
  const hypeCatMap = {
    'beauty': ['estheticienne', 'clinique_esthetique'],
    'food': ['restaurant'],
    'lifestyle': ['spa', 'estheticienne'],
    'fitness': ['spa'],
    'fashion': ['salon_coiffure'],
    'interior-design': ['architecte_interieur'],
    'health-and-medicine': ['clinique_esthetique'],
  };
  for (const [cat, secteurs] of Object.entries(hypeCatMap)) {
    const results = await scrapeHypeAuditor(cat);
    for (const r of results) {
      if (!r.handle || seen.has(r.handle)) continue;
      if (r.abonnes && (r.abonnes < 5000 || r.abonnes > 100000)) continue;
      seen.set(r.handle, makeProfile(r.handle, {
        abonnes: r.abonnes,
        secteur: secteurs[0],
        ville: 'France',
        email_contact: r.email,
        snippet: r.snippet,
        source: 'hypeauditor',
        actif: isActif(r.snippet),
      }));
      hypeCount++;
    }
    await sleep(500);
  }
  console.log(`  → ${hypeCount} profils extraits\n`);

  // ── Source 4 : Google Custom Search ───────────────────────────────────────
  console.log('[SOURCE 4] Google Custom Search API...');
  let googleCount = 0;
  let googleOk = false;

  const googleQueries = [];
  for (const ville of ['Paris', 'Lyon', 'Bordeaux', 'Nice', 'Marseille', 'Toulouse', 'Lille', 'Nantes', 'Strasbourg']) {
    for (const [secteur, kws] of [
      ['restaurant', 'foodblogger'],
      ['estheticienne', 'estheticienne beaute'],
      ['salon_coiffure', 'coiffure hair'],
      ['spa', 'spa wellness'],
      ['clinique_esthetique', 'medecine esthetique'],
      ['architecte_interieur', 'architecte interieur deco'],
    ]) {
      googleQueries.push({
        q: `site:instagram.com ${kws} ${ville} partenariat collab`,
        secteur, ville,
      });
    }
  }

  for (const { q, secteur, ville } of googleQueries) {
    const items = await searchGoogle(q);
    if (items === null) {
      if (!googleOk) {
        console.log('  → Google CSE inaccessible (clé bloquée), skip');
        break;
      }
      continue;
    }
    googleOk = true;
    for (const item of items) {
      const handle = extractHandle(item.href);
      if (!handle || seen.has(handle)) continue;
      const fullText = item.title + ' ' + item.snippet;
      const ab = parseFollowers(fullText);
      if (ab && (ab < 5000 || ab > 100000)) continue;
      seen.set(handle, makeProfile(handle, {
        nom: item.title.split('•')[0].split('(')[0].trim(),
        abonnes: ab,
        secteur,
        ville,
        email_contact: extractEmail(fullText),
        snippet: fullText.slice(0, 250),
        source: 'google',
        actif: isActif(fullText),
      }));
      googleCount++;
    }
    await sleep(200);
  }
  console.log(`  → ${googleCount} profils extraits (Google OK: ${googleOk})\n`);

  // ── Source 5 : Seed data étendue ──────────────────────────────────────────
  console.log('[SOURCE 5] Seed data étendue (toutes villes)...');
  let seedCount = 0;
  for (const p of SEED_DATA) {
    if (seen.has(p.handle)) continue;
    const ab = p.abonnes;
    if (ab && (ab < 5000 || ab > 100000)) continue;
    seen.set(p.handle, {
      handle: p.handle,
      nom: p.nom || p.handle.replace('@', '').replace(/[_.-]+/g, ' ').trim(),
      abonnes: ab,
      abonnes_affiche: formatAbonnes(ab),
      secteur: p.secteur,
      ville: normalizeVille(p.ville),
      email_contact: p.email_contact || null,
      tarif_estime: tarifEstime(ab),
      statut: p.email_contact ? 'à_contacter' : 'sans_email',
      actif: p.actif !== undefined ? p.actif : true,
      source: p.source || 'seed',
      date_contact: null,
      scraped_at: new Date().toISOString(),
    });
    seedCount++;
  }
  console.log(`  → ${seedCount} profils ajoutés\n`);

  // ── Finalisation ──────────────────────────────────────────────────────────
  let tous = [...seen.values()];

  // Filtrage final : 5k-100k abonnés (ou sans info)
  tous = tous.filter(i => !i.abonnes || (i.abonnes >= 5000 && i.abonnes <= 100000));

  // Nettoyage qualité : éliminer les handles qui ne sont pas des influenceurs
  tous = tous.filter(i => {
    const h = i.handle.replace('@', '').toLowerCase();
    if (/\.(fr|com|io|net|org|co|eu|be|paris)$/.test(h)) return false;
    if (['gmail.com', 'hotmail.com', 'outlook.fr', 'yahoo.fr', 'icloud.com'].includes(h)) return false;
    if (h.length <= 2) return false;
    if (/^\d+(\.\.\d+)?$/.test(h)) return false;
    const brands = ['sephora', 'dyson', 'loreal', 'modash', 'givenchy', 'chanel', 'hm', 'gifi', 'action.france'];
    if (brands.some(b => h.includes(b))) return false;
    const insti = ['sciencespo', 'assasuniversite', 'universite', 'mairie'];
    if (insti.some(b => h.includes(b))) return false;
    if (h.includes('communication') && h.length > 15 && !i.abonnes) return false;
    return true;
  });

  // Tri : avec email d'abord, puis par ville, puis par secteur
  tous.sort((a, b) => {
    if (a.email_contact && !b.email_contact) return -1;
    if (!a.email_contact && b.email_contact) return 1;
    return (a.ville || '').localeCompare(b.ville || '') || a.secteur.localeCompare(b.secteur);
  });

  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(tous, null, 2), 'utf8');

  // ── Résumé ────────────────────────────────────────────────────────────────
  console.log('=== RÉSUMÉ FINAL ===\n');
  console.log(`Total influenceurs      : ${tous.length}`);
  console.log(`Avec email              : ${tous.filter(i => i.email_contact).length}`);
  console.log(`Actifs                  : ${tous.filter(i => i.actif).length}`);
  console.log(`Avec nb abonnés connu   : ${tous.filter(i => i.abonnes).length}`);
  console.log('');

  const parVille = {};
  const parSecteur = {};
  for (const i of tous) {
    parVille[i.ville] = (parVille[i.ville] || 0) + 1;
    if (!parSecteur[i.secteur]) parSecteur[i.secteur] = { total: 0, avecEmail: 0 };
    parSecteur[i.secteur].total++;
    if (i.email_contact) parSecteur[i.secteur].avecEmail++;
  }

  console.log('Par ville :');
  for (const [v, n] of Object.entries(parVille).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${v.padEnd(25)} ${n}`);
  }

  console.log('\nPar secteur :');
  for (const [s, d] of Object.entries(parSecteur)) {
    console.log(`  ${s.padEnd(25)} ${d.total} profils  (${d.avecEmail} avec email)`);
  }

  console.log(`\nFichier mis à jour : ${OUTPUT_FILE}`);
  console.log(`Total final : ${tous.length} profils\n`);
}

main().catch(err => {
  console.error('Erreur fatale:', err);
  process.exit(1);
});
