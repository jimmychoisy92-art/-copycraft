import fs from 'fs';

const GOOGLE_API_KEY = 'AIzaSyBGPC9dY5UXQrfDSwevc_A9YLJyhJmbMp4';
const HUNTER_API_KEY = 'f761e4209f97623150e563ea2b284d87629ef090';
const CRM_FILE = './leads.json';

const SEARCHES = [
  // Salons de coiffure haut de gamme
  'salon coiffure haut de gamme Paris 1', 'salon coiffure haut de gamme Paris 2',
  'salon coiffure haut de gamme Paris 3', 'salon coiffure haut de gamme Paris 4',
  'salon coiffure haut de gamme Paris 5', 'salon coiffure haut de gamme Paris 6',
  'salon coiffure haut de gamme Paris 7', 'salon coiffure haut de gamme Paris 8',
  'salon coiffure haut de gamme Paris 9', 'salon coiffure haut de gamme Paris 16',
  'salon coiffure haut de gamme Paris 17', 'salon coiffure luxe Paris',
  'salon coiffure Lyon', 'salon coiffure Bordeaux', 'salon coiffure Marseille',
  'salon coiffure Nantes', 'salon coiffure Toulouse', 'salon coiffure Nice',
  'salon coiffure Neuilly-sur-Seine', 'salon coiffure Versailles',

  // Spas & instituts bien-être
  'spa Paris 1', 'spa Paris 6', 'spa Paris 7', 'spa Paris 8', 'spa Paris 16',
  'spa Lyon', 'spa Bordeaux', 'spa Marseille', 'spa Nice', 'spa Cannes',
  'centre spa Paris', 'spa bien-être Paris', 'spa luxe Paris',
  'hammam spa Paris', 'spa detente Paris',

  // Cliniques esthétiques
  'clinique esthétique Paris', 'clinique esthétique Lyon', 'clinique esthétique Bordeaux',
  'clinique esthétique Marseille', 'clinique esthétique Nice', 'clinique esthétique Toulouse',
  'médecine esthétique Paris 8', 'médecine esthétique Paris 16', 'médecine esthétique Paris 17',
  'centre médecine esthétique Paris', 'laser esthétique Paris',

  // Architectes & décorateurs intérieur
  'architecte intérieur Paris', 'décorateur intérieur Paris', 'architecte intérieur Lyon',
  'architecte intérieur Bordeaux', 'architecte intérieur Marseille',
  'studio architecture intérieur Paris', 'cabinet architecture intérieur Paris',

  // Coachs business & consultants
  'coach business Paris', 'coach professionnel Paris', 'consultant marketing Paris',
  'coach business Lyon', 'coach vie Paris', 'coach carrière Paris',

  // Agences immobilières premium
  'agence immobilière luxe Paris', 'agence immobilière Paris 16',
  'agence immobilière Paris 8', 'agence immobilière Neuilly',
  'promoteur immobilier Paris', 'promoteur immobilier Lyon',
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

function getSecteur(query) {
  if (query.includes('coiffure')) return 'salon_coiffure';
  if (query.includes('spa') || query.includes('hammam')) return 'spa';
  if (query.includes('clinique') || query.includes('médecine') || query.includes('laser')) return 'clinique_esthetique';
  if (query.includes('architecte') || query.includes('décorateur')) return 'architecte_interieur';
  if (query.includes('coach') || query.includes('consultant')) return 'coach_consultant';
  if (query.includes('immobilier') || query.includes('promoteur')) return 'immobilier';
  return 'autre';
}

const PLATEFORMES = ['planity.com', 'treatwell.fr', 'fresha.com', 'doctolib.fr', 'booking.com', 'tripadvisor.com'];

async function main() {
  console.log('🚀 Scraping multi-niches en cours...\n');
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
      if (data.status === 'OVER_QUERY_LIMIT') {
        console.log('⚠️ Quota Google — pause 60s');
        await sleep(60000);
        break;
      }

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
          secteur: getSecteur(query),
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
        console.log(`  ✅ [${lead.secteur}] ${details.name} — ${email || 'pas d\'email'}`);
      }

      pageToken = data.next_page_token;
      page++;
    } while (pageToken && page < 3);

    await sleep(500);
  }

  const parSecteur = {};
  leads.forEach(l => {
    if (!parSecteur[l.secteur]) parSecteur[l.secteur] = { total: 0, email: 0 };
    parSecteur[l.secteur].total++;
    if (l.email) parSecteur[l.secteur].email++;
  });

  console.log('\n✅ TERMINÉ');
  console.log(`📊 Total ajoutés : ${total} | Avec email : ${avecEmail}`);
  console.log('\n📂 Par secteur :');
  Object.entries(parSecteur).forEach(([s, d]) => console.log(`  ${s}: ${d.total} prospects, ${d.email} emails`));
}

main().catch(console.error);
