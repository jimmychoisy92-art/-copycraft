import fs from 'fs';

const GOOGLE_API_KEY = 'AIzaSyBGPC9dY5UXQrfDSwevc_A9YLJyhJmbMp4';
const HUNTER_API_KEY = process.env.HUNTER_KEY;
const CRM_FILE = './leads-restaurants.json';

const SEARCHES = [
  'restaurant gastronomique Paris 1', 'restaurant gastronomique Paris 2',
  'restaurant gastronomique Paris 3', 'restaurant gastronomique Paris 4',
  'restaurant gastronomique Paris 5', 'restaurant gastronomique Paris 6',
  'restaurant gastronomique Paris 7', 'restaurant gastronomique Paris 8',
  'restaurant gastronomique Paris 9', 'restaurant gastronomique Paris 10',
  'restaurant gastronomique Paris 11', 'restaurant gastronomique Paris 12',
  'restaurant gastronomique Paris 13', 'restaurant gastronomique Paris 14',
  'restaurant gastronomique Paris 15', 'restaurant gastronomique Paris 16',
  'restaurant bistronomique Paris', 'restaurant tendance Paris',
  'restaurant Paris site web', 'brasserie Paris site web',
  'restaurant Lyon', 'restaurant Bordeaux', 'restaurant Marseille',
  'restaurant Nantes', 'restaurant Toulouse', 'restaurant Lille',
  'restaurant Nice', 'restaurant Strasbourg', 'restaurant Montpellier',
  'restaurant Rennes', 'restaurant Grenoble', 'restaurant Aix-en-Provence',
  'restaurant Neuilly-sur-Seine', 'restaurant Boulogne-Billancourt',
  'restaurant Versailles', 'restaurant Courbevoie', 'restaurant Levallois',
];

function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function loadCRM() {
  if (fs.existsSync(CRM_FILE)) return JSON.parse(fs.readFileSync(CRM_FILE, 'utf8'));
  return [];
}

function saveCRM(leads) { fs.writeFileSync(CRM_FILE, JSON.stringify(leads, null, 2)); }

async function searchPlaces(query, pageToken = null) {
  let url = `https://maps.googleapis.com/maps/api/place/textsearch/json?query=${encodeURIComponent(query)}&key=${GOOGLE_API_KEY}&language=fr`;
  if (pageToken) url += `&pagetoken=${pageToken}`;
  const res = await fetch(url);
  return res.json();
}

async function getPlaceDetails(placeId) {
  const url = `https://maps.googleapis.com/maps/api/place/details/json?place_id=${placeId}&fields=name,formatted_address,website,formatted_phone_number,rating,user_ratings_total&key=${GOOGLE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  return data.result;
}

async function findEmailWithHunter(domain) {
  try {
    const url = `https://api.hunter.io/v2/domain-search?domain=${domain}&api_key=${HUNTER_API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    if (data.data?.emails?.length > 0) return data.data.emails[0].value;
    return null;
  } catch { return null; }
}

function extractDomain(website) {
  try { return new URL(website).hostname.replace('www.', ''); } catch { return null; }
}

const PLATEFORMES = ['thefork.com', 'lafourchette.com', 'tripadvisor.com', 'booking.com', 'deliveroo.fr', 'ubereats.com', 'just-eat.fr', 'opentable.com'];

async function main() {
  console.log('🍽️ Scraping restaurants...\n');
  const leads = loadCRM();
  const existingSites = new Set(leads.map(l => l.website).filter(Boolean));
  let total = 0, avecEmail = 0;

  for (const query of SEARCHES) {
    console.log(`\n🔍 "${query}"...`);
    let pageToken = null, page = 0;

    do {
      if (page > 0) await sleep(2500);
      const data = await searchPlaces(query, pageToken);
      if (!data.results?.length || data.status === 'ZERO_RESULTS') break;
      if (data.status === 'OVER_QUERY_LIMIT') { await sleep(30000); break; }

      for (const place of data.results) {
        await sleep(150);
        const details = await getPlaceDetails(place.place_id);
        if (!details?.website) continue;
        if (existingSites.has(details.website)) continue;

        const domain = extractDomain(details.website);
        if (!domain) continue;
        if (PLATEFORMES.some(p => domain.includes(p))) continue;

        existingSites.add(details.website);
        total++;

        await sleep(200);
        const email = await findEmailWithHunter(domain);
        if (email) avecEmail++;

        const lead = {
          nom: details.name,
          secteur: 'restaurant',
          ville: query.split(' ').slice(-1)[0],
          adresse: details.formatted_address,
          telephone: details.formatted_phone_number || null,
          website: details.website,
          domain,
          email,
          rating: details.rating || null,
          avis: details.user_ratings_total || 0,
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

  console.log(`\n✅ Terminé — ${total} restaurants, ${avecEmail} avec email`);
}

main().catch(console.error);
