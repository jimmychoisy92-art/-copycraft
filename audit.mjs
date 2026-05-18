// audit.mjs — Module d'audit GMB + Site + Réseaux
// Usage: import { auditLead } from './audit.mjs';

const GOOGLE_API_KEY = 'AIzaSyBGPC9dY5UXQrfDSwevc_A9YLJyhJmbMp4';
const AUDIT_TIMEOUT_MS = 25000;   // timeout global par lead
const SITE_TIMEOUT_MS  = 8000;    // timeout fetch site
const SOCIAL_TIMEOUT_MS = 5000;   // timeout recherche réseaux
const API_DELAY_MS = 300;         // délai entre appels API

const CTA_KEYWORDS = [
  'réserver', 'reserver', 'réservation', 'reservation',
  'contact', 'booking', 'rendez-vous', 'rendez vous', 'rdv',
  'appointment', 'commander', 'commande', 'devis',
  'prendre rendez', 'book', 'réserv',
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

// ─── GMB ──────────────────────────────────────────────────────────────────────

async function auditGMB(lead) {
  // Si le lead a déjà les données GMB, on les utilise directement
  if (lead.rating != null && lead.user_ratings_total != null) {
    const reviewCount = lead.user_ratings_total;
    const rating = lead.rating;
    const status = (reviewCount >= 10 && rating >= 3.0) ? 'optimisee' : 'non_optimisee';
    return {
      status,
      rating,
      reviewCount,
      hasPhotos: null,
      hasDescription: null,
      placeId: lead.place_id || null,
    };
  }

  try {
    const query = encodeURIComponent(`${lead.nom} ${lead.ville || ''}`);
    const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${query}&key=${GOOGLE_API_KEY}`;

    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;

    const data = await res.json();
    await sleep(API_DELAY_MS);

    if (!data.results || data.results.length === 0) {
      return {
        status: 'absent',
        rating: null,
        reviewCount: null,
        hasPhotos: false,
        hasDescription: false,
        placeId: null,
      };
    }

    const place = data.results[0];
    const rating = place.rating || 0;
    const reviewCount = place.user_ratings_total || 0;
    const hasPhotos = !!(place.photos && place.photos.length > 0);

    // Appel détails pour la description
    let hasDescription = false;
    try {
      const detailsUrl = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${place.place_id}&fields=editorial_summary,opening_hours,website&key=${GOOGLE_API_KEY}`;
      const detRes = await fetch(detailsUrl, { signal: AbortSignal.timeout(6000) });
      if (detRes.ok) {
        const detData = await detRes.json();
        hasDescription = !!(detData.result?.editorial_summary?.overview);
      }
      await sleep(API_DELAY_MS);
    } catch {
      // On continue sans la description
    }

    let status;
    if (reviewCount < 10 || rating < 3.0) {
      status = 'non_optimisee';
    } else {
      status = 'optimisee';
    }

    return {
      status,
      rating,
      reviewCount,
      hasPhotos,
      hasDescription,
      placeId: place.place_id,
    };
  } catch {
    return null;
  }
}

// ─── SITE ─────────────────────────────────────────────────────────────────────

async function auditSite(lead, gmbResult) {
  // Récupérer l'URL : depuis le lead ou depuis GMB
  let url = lead.website || null;

  if (!url && gmbResult && gmbResult.placeId) {
    // On pourrait avoir le site depuis GMB details, mais on ne l'a pas stocké ici
    // On considère absent
  }

  if (!url) {
    return {
      status: 'absent',
      url: null,
      hasCTA: false,
    };
  }

  // Normaliser l'URL
  if (!url.startsWith('http')) url = 'https://' + url;

  try {
    const startTime = Date.now();
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      },
      signal: AbortSignal.timeout(SITE_TIMEOUT_MS),
      redirect: 'follow',
    });
    const elapsed = Date.now() - startTime;

    if (!res.ok) {
      return { status: 'non_optimise', url, hasCTA: false };
    }

    const html = await res.text();
    const lowerHtml = html.toLowerCase();

    const hasCTA = CTA_KEYWORDS.some(kw => lowerHtml.includes(kw));

    if (elapsed > 4000 || !hasCTA) {
      return { status: 'non_optimise', url, hasCTA };
    }

    return { status: 'optimise', url, hasCTA };
  } catch {
    return { status: 'non_optimise', url, hasCTA: false };
  }
}

// ─── RÉSEAUX ──────────────────────────────────────────────────────────────────

async function auditReseaux(lead) {
  try {
    const nomEncode = encodeURIComponent(`"${lead.nom}"`);
    const searchUrl = `https://www.google.com/search?q=instagram.com+${nomEncode}&hl=fr`;

    const res = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'Accept-Language': 'fr-FR,fr;q=0.9',
      },
      signal: AbortSignal.timeout(SOCIAL_TIMEOUT_MS),
    });

    if (!res.ok) {
      return { status: 'absent', instagram: null, facebook: null };
    }

    const html = await res.text();
    const lowerHtml = html.toLowerCase();

    // Chercher instagram.com dans les résultats
    const hasInstagram = lowerHtml.includes('instagram.com');

    // Chercher aussi facebook
    const facebookUrl = `https://www.google.com/search?q=facebook.com+${nomEncode}&hl=fr`;
    let hasFacebook = false;
    try {
      await sleep(API_DELAY_MS);
      const fbRes = await fetch(facebookUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html',
          'Accept-Language': 'fr-FR,fr;q=0.9',
        },
        signal: AbortSignal.timeout(SOCIAL_TIMEOUT_MS),
      });
      if (fbRes.ok) {
        const fbHtml = await fbRes.text();
        hasFacebook = fbHtml.toLowerCase().includes('facebook.com');
      }
    } catch {
      // ignore
    }

    const status = (hasInstagram || hasFacebook) ? 'actif' : 'absent';

    return {
      status,
      instagram: hasInstagram ? true : null,
      facebook: hasFacebook ? true : null,
    };
  } catch {
    return { status: 'absent', instagram: null, facebook: null };
  }
}

// ─── MATRICE EMAIL ────────────────────────────────────────────────────────────

function resolveEmailType(gmb, site, reseaux) {
  if (!gmb || gmb.status === 'absent')                return 'A';
  if (gmb.status === 'non_optimisee')                 return 'B';
  if (gmb.status === 'optimisee' && (!site || site.status === 'absent'))        return 'C';
  if (gmb.status === 'optimisee' && site.status === 'non_optimise')             return 'D';
  if (gmb.status === 'optimisee' && site.status === 'optimise' && (!reseaux || reseaux.status === 'absent')) return 'E';
  if (gmb.status === 'optimisee' && site.status === 'optimise' && reseaux.status === 'actif') return 'G';
  return 'G';
}

// ─── EXPORT PRINCIPAL ─────────────────────────────────────────────────────────

export async function auditLead(lead) {
  try {
    // Timeout global de 25s pour tout l'audit
    const auditPromise = runAudit(lead);
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Audit timeout 25s')), AUDIT_TIMEOUT_MS)
    );

    return await Promise.race([auditPromise, timeoutPromise]);
  } catch (err) {
    console.log(`  ⚠️  Audit échoué pour ${lead.nom}: ${err.message}`);
    return null;
  }
}

async function runAudit(lead) {
  // Étape 1 — GMB
  const gmb = await auditGMB(lead);
  if (gmb === null) return null; // erreur critique

  await sleep(API_DELAY_MS);

  // Étape 2 — Site
  const site = await auditSite(lead, gmb);

  await sleep(API_DELAY_MS);

  // Étape 3 — Réseaux
  const reseaux = await auditReseaux(lead);

  // Matrice
  const emailType = resolveEmailType(gmb, site, reseaux);

  return {
    emailType,
    gmb,
    site,
    reseaux,
  };
}
