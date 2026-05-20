import fs from 'fs';
import nodemailer from 'nodemailer';
import Anthropic from '@anthropic-ai/sdk';

const CRM_FILE = './leads.json';
const CLAUDE_API_KEY = 'process.env.ANTHROPIC_API_KEY';

const anthropic = new Anthropic({ apiKey: CLAUDE_API_KEY });

const transporter = nodemailer.createTransport({
  host: 'ssl0.ovh.net',
  port: 465,
  secure: true,
  auth: {
    user: 'contact@thecopycraft.fr',
    pass: process.env.SMTP_PASS,
  },
});

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function loadCRM() {
  return JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
}

function saveCRM(leads) {
  fs.writeFileSync(CRM_FILE, JSON.stringify(leads, null, 2));
}

async function fetchWebsite(url) {
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
      signal: AbortSignal.timeout(10000),
    });
    const html = await res.text();
    // Extraire le texte brut — supprimer les balises HTML
    const text = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 3000); // Limiter pour Claude
    return text;
  } catch (err) {
    return null;
  }
}

async function analyzeWithClaude(nomInstitut, url, pageText) {
  const prompt = `Tu es un expert copywriter. Analyse cette page d'accueil d'un institut de beauté et identifie 3 problèmes CONCRETS et SPÉCIFIQUES dans le texte qui freinent les réservations.

Institut : ${nomInstitut}
URL : ${url}

Texte de la page :
${pageText}

Règles strictes :
- Cite des éléments RÉELS de leur page (un vrai titre, une vraie phrase, une vraie absence)
- Pas de généralités — sois précis sur CE QUI EST écrit ou absent sur CETTE page
- Ton sobre, direct, professionnel
- Chaque point en 1-2 phrases maximum

Réponds UNIQUEMENT avec ce format JSON :
{
  "point1": "...",
  "point2": "...",
  "point3": "..."
}`;

  const response = await anthropic.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    messages: [{ role: 'user', content: prompt }],
  });

  try {
    const text = response.content[0].text;
    const json = text.match(/\{[\s\S]*\}/)[0];
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function buildEmail(nomInstitut, points) {
  return {
    subject: `J'ai analysé le site de ${nomInstitut}`,
    text: `Bonjour,

J'ai visité le site de ${nomInstitut} et j'ai relevé 3 points précis qui freinent probablement vos réservations.

1. ${points.point1}

2. ${points.point2}

3. ${points.point3}

Je suis copywriter spécialisé dans les instituts de beauté. Je réécris les pages de sites pour transformer les visiteuses en clientes.

Si vous voulez, je vous envoie une version retravaillée de votre page d'accueil — gratuitement, sans engagement.

Bonne journée,

TheCopyCraft
contact@thecopycraft.fr`,
  };
}

async function main() {
  const leads = loadCRM();
  const today = new Date().toISOString().split('T')[0];

  const platformes = ['planity.com', 'treatwell.fr', 'fresha.com'];
  const cibles = leads.filter(l => {
    if (!l.email) return false;
    if (platformes.some(p => l.email.includes(p))) return false;
    if (l.statut !== 'à_contacter') return false;
    return true;
  });

  console.log(`🎯 ${cibles.length} leads à contacter\n`);

  for (const lead of cibles) {
    console.log(`\n🔍 Analyse de ${lead.nom} (${lead.website})...`);

    // 1. Récupérer le site
    const pageText = await fetchWebsite(lead.website);
    if (!pageText) {
      console.log(`  ⚠️ Site inaccessible — skip`);
      continue;
    }

    // 2. Analyser avec Claude
    const points = await analyzeWithClaude(lead.nom, lead.website, pageText);
    if (!points) {
      console.log(`  ⚠️ Analyse échouée — skip`);
      continue;
    }

    console.log(`  ✅ Analyse OK :`);
    console.log(`     1. ${points.point1}`);
    console.log(`     2. ${points.point2}`);
    console.log(`     3. ${points.point3}`);

    // 3. Construire et envoyer l'email
    const { subject, text } = buildEmail(lead.nom, points);

    try {
      await transporter.sendMail({
        from: '"TheCopyCraft" <contact@thecopycraft.fr>',
        to: lead.email,
        subject,
        text,
      });

      lead.statut = 'j0_envoyé';
      lead.date_contact = today;
      lead.analyse = points;
      saveCRM(leads);

      console.log(`  📧 Email envoyé à ${lead.email}`);
    } catch (err) {
      console.log(`  ❌ Erreur envoi : ${err.message}`);
    }

    // Délai anti-spam
    const delai = 45000 + Math.random() * 60000;
    console.log(`  ⏳ Pause ${Math.round(delai/1000)}s...`);
    await sleep(delai);
  }

  console.log(`\n✅ Campagne terminée`);
}

main().catch(console.error);
