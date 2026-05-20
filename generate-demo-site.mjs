// generate-demo-site.mjs — Génère un site HTML personnalisé, le déploie sur GitHub Pages,
// prend un screenshot et retourne l'URL + base64 du screenshot.
//
// Usage CLI: node generate-demo-site.mjs "Nom du commerce" secteur ville
// Ex:        node generate-demo-site.mjs "Maison de Beauté Dulcenae" estheticienne Paris

import Anthropic from '@anthropic-ai/sdk';
import puppeteer from 'puppeteer';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';
import { promisify } from 'util';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const execAsync = promisify(exec);
const DEMOS_DIR = path.join(__dirname, 'demos');

if (!fs.existsSync(DEMOS_DIR)) fs.mkdirSync(DEMOS_DIR, { recursive: true });

const GITHUB_PAGES_BASE = 'https://jimmychoisy92-art.github.io/-copycraft/demos';
const CALENDLY_URL = 'https://calendly.com/agenda-pro/rdv-tel-copy-craft';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ─── SLUGIFY ─────────────────────────────────────────────────────────────────

function slugify(str) {
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')   // supprime accents
    .replace(/[^a-z0-9\s-]/g, '')      // garde lettres, chiffres, espaces, tirets
    .trim()
    .replace(/\s+/g, '-')              // espaces → tirets
    .replace(/-+/g, '-')               // tirets multiples → un seul
    .slice(0, 40);                      // max 40 chars
}

// ─── PROMPTS PAR SECTEUR ─────────────────────────────────────────────────────

const SECTOR_STYLES = {
  restaurant: {
    palette: 'tons chauds : bordeaux (#6B1A1A), crème (#FFF8EE), or (#C9A84C), brun chaleureux (#3D2B1F)',
    univers: 'bistrot parisien élégant, ambiance chaleureuse et conviviale, carte du restaurant mise en avant, réservation en ligne',
    font: "'Playfair Display', serif",
    services: ['Menu du jour 2 plats', 'Formule déjeuner', 'Dîner à la carte', 'Privatisation de salle', 'Brunch dominical', 'Menus groupes'],
    tarifs: ['15€', '22€', '35€–65€', 'Sur devis', '28€', 'À partir de 25€/pers'],
    temoignages: [
      { prenom: 'Mathilde D.', ville: 'Paris 11e', texte: 'Une cuisine généreuse et authentique, le chef sait exactement ce qu\'il fait. On est venus pour un anniversaire et on reviendra pour le plaisir.' },
      { prenom: 'Pierre-Antoine L.', ville: 'Boulogne-Billancourt', texte: 'Meilleure adresse du quartier. Le service est aux petits soins et les produits sont vraiment de qualité. Réservation facile en ligne.' },
      { prenom: 'Sophie R.', ville: 'Paris 12e', texte: 'Le cadre est magnifique, l\'ambiance parfaite pour une soirée en couple. Les desserts sont à tomber.' },
    ],
  },
  estheticienne: {
    palette: 'tons doux : rosé poudré (#F5D0D0), nude (#E8C9A0), beige doré (#D4A876), blanc cassé (#FAFAF7)',
    univers: 'élégance féminine, douceur et raffinement, soins personnalisés mis en avant, ambiance cosy et intime',
    font: "'Cormorant Garamond', serif",
    services: ['Soin visage sur mesure', 'Épilation intégrale', 'Manucure & pédicure', 'Massage relaxant', 'Soin corps & enveloppement', 'Mise en beauté'],
    tarifs: ['65€', '45€', '35€', '60€', '85€', '90€'],
    temoignages: [
      { prenom: 'Camille B.', ville: 'Paris 8e', texte: 'Ma peau est transformée depuis le soin visage. Une technicienne exceptionnelle qui prend vraiment le temps d\'écouter et de personnaliser chaque soin.' },
      { prenom: 'Inès M.', ville: 'Neuilly-sur-Seine', texte: 'Je viens depuis 3 ans et je ne changerai jamais. L\'ambiance est apaisante, les soins efficaces, et on repart toujours avec le sourire.' },
      { prenom: 'Laurence V.', ville: 'Paris 9e', texte: 'Un vrai moment de détente et de bien-être. Les produits utilisés sont haut de gamme et les conseils sont précieux.' },
    ],
  },
  salon_coiffure: {
    palette: 'noir profond (#1A1A1A), blanc pur (#FFFFFF), or champagne (#C9A84C), gris perle (#E8E8E8)',
    univers: 'moderne et urbain, style editorial, galerie avant/après, expertise coloriste mise en avant',
    font: "'Raleway', sans-serif",
    services: ['Coupe femme', 'Coupe homme', 'Coloration & mèches', 'Balayage & ombré', 'Lissage brésilien', 'Soin kératine'],
    tarifs: ['55€', '30€', '85€', '110€', '180€', '120€'],
    temoignages: [
      { prenom: 'Alexandra T.', ville: 'Paris 17e', texte: 'Mon balayage est exactement ce que je voulais. Le coloriste a su interpréter mes envies et le résultat est naturel et lumineux.' },
      { prenom: 'Julie F.', ville: 'Levallois-Perret', texte: 'Salon au top du top. L\'accueil est chaleureux, les coiffeurs sont des artistes. Mon lissage tient depuis 4 mois sans jamais friser.' },
      { prenom: 'Noémie S.', ville: 'Paris 8e', texte: 'J\'y viens depuis l\'ouverture. C\'est le seul salon où je ressors vraiment satisfaite. Expertise et écoute au rendez-vous.' },
    ],
  },
  spa: {
    palette: 'vert sauge (#8FAF8A), blanc cassé (#FAFAF5), beige naturel (#E8DCC8), vert profond (#3D5A40)',
    univers: 'zen et minimaliste, nature et bien-être, rituels ancestraux mis en avant, ressourcement et sérénité',
    font: "'Josefin Sans', sans-serif",
    services: ['Massage balinais 60min', 'Hammam & gommage', 'Rituel oriental complet', 'Massage aux pierres chaudes', 'Soin visage holistique', 'Bulle duo'],
    tarifs: ['80€', '55€', '150€', '90€', '75€', '180€'],
    temoignages: [
      { prenom: 'Émilie G.', ville: 'Paris 16e', texte: 'Une parenthèse hors du temps. Le massage balinais est une merveille — je suis ressortie complètement régénérée. Je recommande sans hésiter.' },
      { prenom: 'Nadia K.', ville: 'Paris 7e', texte: 'Le rituel oriental est exceptionnel. La praticienne est très professionnelle et l\'espace est d\'une sérénité rare en plein Paris.' },
      { prenom: 'Charlotte M.', ville: 'Boulogne', texte: 'On a pris la bulle duo pour notre anniversaire de mariage. Un moment magique, on en parle encore. Merci pour cette expérience.' },
    ],
  },
  clinique_esthetique: {
    palette: 'blanc immaculé (#FFFFFF), bleu nuit (#0A1628), or médical (#B8A060), gris platine (#F0F0F2)',
    univers: 'médical haut de gamme, expertise et rigueur scientifique, résultats prouvés mis en avant, confiance et professionnalisme',
    font: "'Montserrat', sans-serif",
    services: ['Consultation médicale', 'Injections acide hyaluronique', 'Peeling chimique', 'Laser CO2 fractionné', 'Mésothérapie', 'Fil tenseur'],
    tarifs: ['Gratuite', 'À partir de 350€', '180€', 'À partir de 450€', '250€', 'À partir de 600€'],
    temoignages: [
      { prenom: 'Sylvie D.', ville: 'Paris 8e', texte: 'Un résultat naturel et parfaitement dosé. Le médecin a pris le temps d\'expliquer chaque étape et de comprendre ce que je voulais. Un vrai professionnel.' },
      { prenom: 'Marie-Claire P.', ville: 'Neuilly', texte: 'Je suis patiente depuis 5 ans. Chaque traitement est adapté et les résultats sont toujours à la hauteur. Discrétion et expertise au rendez-vous.' },
      { prenom: 'Isabelle R.', ville: 'Paris 16e', texte: 'La clinique qui a changé mon regard sur l\'esthétique médicale. Des résultats bluffants, un suivi rigoureux et une équipe bienveillante.' },
    ],
  },
  architecte_interieur: {
    palette: 'gris anthracite (#2D2D2D), blanc pur (#FFFFFF), bois clair (#C8A882), beige chaud (#F5F0E8)',
    univers: 'minimalisme luxueux, portfolio de réalisations, matériaux nobles, expertise et savoir-faire mis en avant',
    font: "'Libre Baskerville', serif",
    services: ['Consultation décoration', 'Projet complet A–Z', 'Rénovation appartement', 'Aménagement cuisine/SDB', 'Mise en lumière', 'Home staging'],
    tarifs: ['150€/h', 'Sur devis', 'À partir de 8 000€', 'À partir de 3 500€', '200€/h', 'À partir de 1 500€'],
    temoignages: [
      { prenom: 'Thomas & Léa B.', ville: 'Paris 9e', texte: 'Notre appartement est méconnaissable — en mieux. Chaque détail a été pensé pour nous. 6 semaines de chantier, 0 stress, 100% satisfaits.' },
      { prenom: 'François M.', ville: 'Vincennes', texte: 'Un talent rare pour transformer un espace ordinaire en quelque chose de vraiment unique. Le budget est respecté et les délais aussi.' },
      { prenom: 'Caroline D.', ville: 'Paris 6e', texte: 'Travail d\'une précision remarquable. Le studio est passé de fonctionnel à vraiment beau. Je reçois des compliments à chaque visite.' },
    ],
  },
};

// ─── GÉNÉRATION HTML VIA CLAUDE ───────────────────────────────────────────────

async function generateSiteHTML(lead) {
  const secteur = lead.secteur || 'restaurant';
  const style = SECTOR_STYLES[secteur] || SECTOR_STYLES.restaurant;
  const ville = lead.ville || 'Paris';
  const rating = lead.rating || lead.note || '';
  const tel = lead.telephone || lead.phone || '';
  const email = lead.email || 'contact@thecopycraft.fr';
  const adresse = lead.adresse || lead.address || ville;

  const servicesAvecTarifs = style.services.map((s, i) => `${s} — ${style.tarifs[i]}`).join(', ');
  const temoignagesStr = style.temoignages.map((t, i) =>
    `Témoignage ${i + 1}: "${t.texte}" — ${t.prenom}, ${t.ville}`
  ).join('\n');

  const prompt = `Tu dois générer un site web HTML complet et moderne pour un commerce local. Le HTML doit être autonome (tout inline, pas de fichier externe sauf une Google Font), professionnel, et visuellement impactant.

INFORMATIONS DU COMMERCE :
- Nom : ${lead.nom}
- Secteur : ${secteur}
- Ville : ${ville}
- Adresse : ${adresse}
${tel ? `- Téléphone : ${tel}` : ''}
${rating ? `- Note Google : ${rating}/5` : ''}
${lead.website ? `- Ancien site (à améliorer) : ${lead.website}` : ''}
- Email de contact : ${email}
- Lien Calendly RDV : ${CALENDLY_URL}

UNIVERS VISUEL DU SECTEUR "${secteur.toUpperCase()}" :
- Palette : ${style.palette}
- Ambiance : ${style.univers}
- Police principale (Google Fonts) : ${style.font}

SERVICES ET TARIFS ESTIMÉS :
${servicesAvecTarifs}

TÉMOIGNAGES À INTÉGRER (adapter légèrement pour le nom du commerce) :
${temoignagesStr}

STRUCTURE OBLIGATOIRE DU SITE :
1. <head> avec meta charset, viewport responsive, lien Google Fonts (1 seule police), title avec le nom du commerce
2. Navigation fixe (sticky) avec logo/nom du commerce + liens : Accueil, Services, Avis, Contact
3. Section HERO plein écran impactant :
   - Fond dégradé avec les couleurs du secteur (pas d'image externe)
   - Titre h1 avec le NOM RÉEL du commerce
   - Sous-titre accroche personnalisée selon le secteur
   ${rating ? `- Badge "Note Google : ${rating}/5 ⭐"` : ''}
   - 2 boutons CTA : "Prendre rendez-vous" (lien Calendly) + "Nos services" (ancre #services)
4. Section SERVICES (id="services") :
   - Titre de section élégant
   - Grid de 3 ou 6 cartes prestations avec titre, description courte et tarif
   - Design carte adapté à l'univers visuel
5. Section CHIFFRES (fond dark ou coloré) :
   - ${rating ? `Note Google : ${rating}/5` : 'Note Google : 4.8/5'}
   - Clients satisfaits : 850+
   - Années d'expérience : 8
   - Un 4e chiffre pertinent selon le secteur
6. Section TÉMOIGNAGES (3 témoignages) :
   - Cards avec étoiles ⭐⭐⭐⭐⭐
   - Citation, prénom, ville
   - Design élégant avec fond légèrement coloré
7. Section CONTACT / CTA FINAL :
   - Fond dark ou couleur principale
   - Texte d'appel à l'action
   - Email cliquable : ${email}
   - Bouton principal : "Réserver un créneau" → ${CALENDLY_URL}
   ${tel ? `- Téléphone : ${tel}` : ''}
   - Adresse : ${adresse}
8. Footer :
   - Nom du commerce + année
   - Liens discrets

RÈGLES TECHNIQUES :
- DOCTYPE html5, lang="fr"
- Tout le CSS inline dans <style> dans le <head>
- Responsive mobile obligatoire (media queries)
- Pas de JavaScript externe, animations CSS légères uniquement
- Pas d'images externes (utiliser des gradients, formes SVG simples, ou emojis comme icônes)
- Les icônes peuvent être des emojis Unicode ou SVG inline
- Le HTML doit être complet de <!DOCTYPE html> à </html>

Retourne UNIQUEMENT le code HTML complet, sans aucun commentaire avant/après, sans balises \`\`\`.`;

  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 8000,
        messages: [{ role: 'user', content: prompt }],
      });

      let html = response.content[0].text;
      // Nettoyer si Claude entoure de backticks
      html = html.replace(/^```html\n?/i, '').replace(/\n?```$/i, '').trim();
      return html;
    } catch (e) {
      if ((e.status === 529 || e.status === 503) && attempt < 3) {
        console.log(`    ⏳ Claude surchargé, retry ${attempt}/3 dans 30s...`);
        await new Promise(r => setTimeout(r, 30000));
      } else {
        throw e;
      }
    }
  }
  throw new Error('Génération HTML échouée après 3 tentatives');
}

// ─── DÉPLOIEMENT GITHUB PAGES ─────────────────────────────────────────────────

async function deployToGitHub(slug, html) {
  const filePath = path.join(DEMOS_DIR, `${slug}.html`);
  fs.writeFileSync(filePath, html, 'utf8');
  console.log(`    💾 Fichier écrit : demos/${slug}.html`);

  try {
    const { stdout, stderr } = await execAsync(
      `cd /Users/jimmychoisy/dev/copycraft && git add demos/${slug}.html && git commit -m "Demo site: ${slug}" && git push`,
      { timeout: 60000 }
    );
    if (stdout) console.log(`    📤 Git: ${stdout.trim()}`);
    if (stderr && !stderr.includes('Everything up-to-date') && !stderr.includes('To https')) {
      console.log(`    ⚠️  Git stderr: ${stderr.trim()}`);
    }
  } catch (e) {
    // Si "nothing to commit" c'est OK (fichier identique)
    if (e.message && e.message.includes('nothing to commit')) {
      console.log(`    ℹ️  Aucun changement à committer (fichier identique)`);
    } else {
      throw new Error(`Git push échoué: ${e.message}`);
    }
  }

  const url = `${GITHUB_PAGES_BASE}/${slug}.html`;
  console.log(`    🌐 URL publique : ${url}`);
  return url;
}

// ─── SCREENSHOT ───────────────────────────────────────────────────────────────

async function takeScreenshot(url) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });

    try {
      await page.goto(url, { waitUntil: 'networkidle0', timeout: 30000 });
    } catch {
      // Fallback si networkidle0 timeout
      try {
        await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
        await new Promise(r => setTimeout(r, 3000));
      } catch (e2) {
        throw new Error(`Impossible de charger la page: ${e2.message}`);
      }
    }

    // Attendre que les fonts Google soient chargées
    await new Promise(r => setTimeout(r, 1500));

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 800 },
    });

    await browser.close();
    return screenshotBuffer.toString('base64');

  } catch (e) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    throw e;
  }
}

// ─── SCREENSHOT LOCAL (depuis HTML en mémoire) ────────────────────────────────

async function takeScreenshotFromHTML(html) {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });

    const page = await browser.newPage();
    await page.setViewport({ width: 1200, height: 800, deviceScaleFactor: 1 });
    await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30000 });
    await new Promise(r => setTimeout(r, 1500));

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      clip: { x: 0, y: 0, width: 1200, height: 800 },
    });

    await browser.close();
    return screenshotBuffer.toString('base64');

  } catch (e) {
    if (browser) {
      try { await browser.close(); } catch {}
    }
    throw e;
  }
}

// ─── FONCTION PRINCIPALE ──────────────────────────────────────────────────────

async function generateDemoForLead(lead) {
  const slug = slugify(lead.nom);
  console.log(`  🎨 Génération site démo pour : ${lead.nom} (slug: ${slug})`);

  // 1. Générer HTML
  console.log(`  ✍️  Génération HTML avec Claude...`);
  const html = await generateSiteHTML(lead);
  console.log(`  ✅ HTML généré (${Math.round(html.length / 1024)}KB)`);

  // 2. Déployer sur GitHub Pages
  console.log(`  📤 Déploiement GitHub Pages...`);
  let url;
  try {
    url = await deployToGitHub(slug, html);
  } catch (e) {
    console.log(`  ⚠️  Déploiement GitHub échoué: ${e.message}`);
    // Fallback : URL calculée même si push échoué
    url = `${GITHUB_PAGES_BASE}/${slug}.html`;
  }

  // 3. Attendre GitHub Pages (propagation)
  console.log(`  ⏳ Attente propagation GitHub Pages (15s)...`);
  await new Promise(r => setTimeout(r, 15000));

  // 4. Screenshot
  console.log(`  📸 Screenshot en cours...`);
  let screenshotBase64;
  try {
    screenshotBase64 = await takeScreenshot(url);
    console.log(`  ✅ Screenshot OK (${Math.round(screenshotBase64.length / 1024)}KB base64)`);
  } catch (e) {
    console.log(`  ⚠️  Screenshot URL échoué: ${e.message}`);
    console.log(`  📸 Fallback: screenshot depuis HTML local...`);
    try {
      screenshotBase64 = await takeScreenshotFromHTML(html);
      console.log(`  ✅ Screenshot local OK`);
    } catch (e2) {
      console.log(`  ❌ Screenshot échoué: ${e2.message}`);
      screenshotBase64 = null;
    }
  }

  return { url, screenshotBase64, slug, html };
}

// ─── EXPORTS ─────────────────────────────────────────────────────────────────

export { generateDemoForLead, generateSiteHTML, deployToGitHub, takeScreenshot, slugify };

// ─── CLI ─────────────────────────────────────────────────────────────────────

// Détection mode CLI
const isCLI = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));

if (isCLI) {
  const [,, nomArg, secteurArg, villeArg] = process.argv;

  if (!nomArg || !secteurArg) {
    console.error('Usage: node generate-demo-site.mjs "Nom Commerce" secteur [ville]');
    console.error('Secteurs: restaurant, estheticienne, salon_coiffure, spa, clinique_esthetique, architecte_interieur');
    process.exit(1);
  }

  const lead = {
    nom: nomArg,
    secteur: secteurArg,
    ville: villeArg || 'Paris',
    email: 'contact@thecopycraft.fr',
  };

  console.log(`\n🚀 Génération démo pour : ${lead.nom} (${lead.secteur}, ${lead.ville})\n`);

  generateDemoForLead(lead)
    .then(({ url, screenshotBase64, slug }) => {
      console.log(`\n✅ Terminé !`);
      console.log(`   URL: ${url}`);
      console.log(`   Slug: ${slug}`);
      console.log(`   Screenshot: ${screenshotBase64 ? `OK (${Math.round(screenshotBase64.length / 1024)}KB)` : 'ÉCHEC'}`);
    })
    .catch(e => {
      console.error(`\n❌ Erreur: ${e.message}`);
      console.error(e.stack);
      process.exit(1);
    });
}
