import fs from 'fs';

const GOOGLE_API_KEY = 'AIzaSyBGPC9dY5UXQrfDSwevc_A9YLJyhJmbMp4';
const HUNTER_API_KEY = process.env.HUNTER_KEY;
const CRM_FILE = './leads.json';

// Villes + arrondissements Paris pour maximiser les résultats
const SEARCHES = [
  // Paris par arrondissement
  'institut beauté Paris 1', 'institut beauté Paris 2', 'institut beauté Paris 3',
  'institut beauté Paris 4', 'institut beauté Paris 5', 'institut beauté Paris 6',
  'institut beauté Paris 7', 'institut beauté Paris 8', 'institut beauté Paris 9',
  'institut beauté Paris 10', 'institut beauté Paris 11', 'institut beauté Paris 12',
  'institut beauté Paris 13', 'institut beauté Paris 14', 'institut beauté Paris 15',
  'institut beauté Paris 16', 'institut beauté Paris 17', 'institut beauté Paris 18',
  'institut beauté Paris 19', 'institut beauté Paris 20',
  // IDF
  'institut beauté Boulogne-Billancourt', 'institut beauté Neuilly-sur-Seine',
  'institut beauté Vincennes', 'institut beauté Saint-Denis', 'institut beauté Montreuil',
  'institut beauté Créteil', 'institut beauté Versailles', 'institut beauté Nanterre',
  'institut beauté Argenteuil', 'institut beauté Vitry-sur-Seine',
  'institut beauté Asnières-sur-Seine', 'institut beauté Colombes',
  'institut beauté Saint-Maur-des-Fossés', 'institut beauté Courbevoie',
  'institut beauté Rueil-Malmaison', 'institut beauté Antony', 'institut beauté Levallois-Perret',
  'institut beauté Noisy-le-Grand', 'institut beauté Aubervilliers', 'institut beauté Champigny',
  // Grandes villes
  'esthéticienne Lyon', 'institut beauté Lyon 1', 'institut beauté Lyon 2',
  'institut beauté Lyon 3', 'institut beauté Lyon 6', 'institut beauté Lyon 7',
  'esthéticienne Marseille', 'institut beauté Marseille 1', 'institut beauté Marseille 8',
  'esthéticienne Toulouse', 'institut beauté Toulouse centre',
  'esthéticienne Bordeaux', 'institut beauté Bordeaux centre',
  'esthéticienne Nantes', 'esthéticienne Lille', 'esthéticienne Strasbourg',
  'esthéticienne Nice', 'esthéticienne Montpellier', 'esthéticienne Rennes',
  'esthéticienne Grenoble', 'esthéticienne Toulon', 'esthéticienne Dijon',
  'esthéticienne Angers', 'esthéticienne Nîmes', 'esthéticienne Clermont-Ferrand',
  'esthéticienne Aix-en-Provence', 'esthéticienne Reims', 'esthéticienne Metz',
  'esthéticienne Besançon', 'esthéticienne Perpignan', 'esthéticienne Orléans',
  // Variantes mots clés
  'centre esthétique Paris', 'salon beauté Paris', 'spa esthétique Paris',
  'soins visage Paris', 'épilation laser Paris', 'soins corps Paris',
  'centre esthétique Lyon', 'salon beauté Lyon', 'centre esthétique Bordeaux',
  'salon beauté Marseille', 'centre esthétique Nantes', 'spa beauté Toulouse',
];

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function loadCRM() {
  if (fs.existsSync(CRM_FILE)) {
    return JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
  }
  return [];
}

function saveCRM(leads) {
  fs.writeFileSync(CRM_FILE, JSON.stringify(leads, null, 2));
}

async function searchPlaces(query, pageToken = null) {
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&language=fr`;
  if (pageToken) url += `&pagetoken=${pageToken}`;
  const res = await fetch(url);
  return res.json();
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,website,formatted_phone_number,rating&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result;
}

async function findEmailWithHunter(domain) {
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.data?.emails?.length > 0) {
      return data.data.emails[0].value;
    }
    return null;
  } catch {
    return null;
  }
}

function extractDomain(website) {
  try {
    return new URL(website).hostname.replace('www.', '');
  } catch {
    return null;
  }
}

function extractVille(query) {
  const parts = query.split(' ');
  return parts.slice(2).join(' ');
}

async function main() {
  console.log('🚀 Démarrage prospection massive esthéticiennes...\n');

  const leads = loadCRM();
  const existingPlaces = new Set(leads.map(l => l.website).filter(Boolean));

  let totalTrouvés = 0;
  let totalAvecEmail = 0;

  for (const query of SEARCHES) {
    console.log(`\n🔍 "${query}"...`);

    let pageToken = null;
    let page = 0;

    do {
      if (page > 0) await sleep(2500);

      const data = await searchPlaces(query, pageToken);

      if (data.status === 'ZERO_RESULTS' || !data.results?.length) break;
      if (data.status === 'OVER_QUERY_LIMIT') {
        console.log('⚠️ Quota Google atteint, pause 30s...');
        await sleep(30000);
        break;
      }

      for (const place of data.results) {
        await sleep(150);
        const details = await getPlaceDetails(place.place_id);

        if (!details?.website) continue;
        if (existingPlaces.has(details.website)) continue;

        // Filtrer plateformes
        const domain = extractDomain(details.website);
        if (!domain) continue;
        if (['planity.com', 'treatwell.fr', 'fresha.com', 'doctolib.fr', 'lafourchette.com'].includes(domain)) continue;

        existingPlaces.add(details.website);
        totalTrouvés++;

        await sleep(200);
        const email = await findEmailWithHunter(domain);
        if (email) totalAvecEmail++;

        const lead = {
          nom: details.name,
          ville: extractVille(query),
          adresse: details.formatted_address,
          telephone: details.formatted_phone_number || null,
          website: details.website,
          domain,
          email,
          rating: details.rating || null,
          statut: 'à_contacter',
          date_ajout: new Date().toISOString().split('T')[0],
          notes: ''
        };

        leads.push(lead);
        saveCRM(leads);

        console.log(`  ✅ ${details.name} — ${email || 'pas d\'email'}`);
      }

      pageToken = data.next_page_token;
      page++;

    } while (pageToken && page < 3);

    await sleep(500);
  }

  const avecEmail = leads.filter(l => l.email);
  console.log(`\n✅ TERMINÉ`);
  console.log(`📊 Total : ${leads.length} prospects`);
  console.log(`📧 Avec email : ${avecEmail.length}`);
  console.log(`💾 Sauvegardé dans leads.json`);
}

main().catch(console.error);
