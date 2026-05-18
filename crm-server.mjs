import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { exec } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 4567;

const LEADS_FILE = path.join(__dirname, 'leads-all.json');
const INTERACTIONS_FILE = path.join(__dirname, 'crm-interactions.json');
const REMINDERS_FILE = path.join(__dirname, 'crm-reminders.json');

app.use(express.json({ limit: '10mb' }));
app.use(express.static('/Users/jimmychoisy/dev/copycraft'));

function loadJSON(file, fallback = []) {
  if (!fs.existsSync(file)) return fallback;
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function saveJSON(file, data) { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }

// GET leads
app.get('/api/leads', (req, res) => {
  const leads = loadJSON(LEADS_FILE);
  const interactions = loadJSON(INTERACTIONS_FILE);
  const reminders = loadJSON(REMINDERS_FILE);
  // Enrichir chaque lead avec ses interactions et rappels
  const enriched = leads.map((l, i) => ({
    ...l,
    _id: l._id || `${i}`,
    interactions: interactions.filter(x => x.leadId === (l._id || `${i}`)),
    reminders: reminders.filter(x => x.leadId === (l._id || `${i}`) && !x.done),
  }));
  res.json(enriched);
});

// PATCH lead (statut, notes, montant...)
app.patch('/api/leads/:id', (req, res) => {
  const leads = loadJSON(LEADS_FILE);
  const idx = leads.findIndex((l, i) => (l._id || `${i}`) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  leads[idx] = { ...leads[idx], ...req.body };
  saveJSON(LEADS_FILE, leads);
  res.json(leads[idx]);
});

// POST interaction (ajout note/appel/RDV)
app.post('/api/interactions', (req, res) => {
  const interactions = loadJSON(INTERACTIONS_FILE);
  const entry = {
    id: Date.now().toString(),
    leadId: req.body.leadId,
    type: req.body.type, // email | appel | rdv | note
    contenu: req.body.contenu,
    date: new Date().toISOString(),
  };
  interactions.push(entry);
  saveJSON(INTERACTIONS_FILE, interactions);
  res.json(entry);
});

// POST reminder
app.post('/api/reminders', (req, res) => {
  const reminders = loadJSON(REMINDERS_FILE);
  const entry = {
    id: Date.now().toString(),
    leadId: req.body.leadId,
    leadNom: req.body.leadNom,
    message: req.body.message,
    datetime: req.body.datetime,
    done: false,
  };
  reminders.push(entry);
  saveJSON(REMINDERS_FILE, reminders);
  res.json(entry);
});

// PATCH reminder (marquer done)
app.patch('/api/reminders/:id', (req, res) => {
  const reminders = loadJSON(REMINDERS_FILE);
  const r = reminders.find(x => x.id === req.params.id);
  if (!r) return res.status(404).json({ error: 'Not found' });
  Object.assign(r, req.body);
  saveJSON(REMINDERS_FILE, reminders);
  res.json(r);
});

// GET reminders à venir
app.get('/api/reminders/pending', (req, res) => {
  const reminders = loadJSON(REMINDERS_FILE);
  const now = new Date();
  const pending = reminders.filter(r => !r.done && new Date(r.datetime) <= now);
  res.json(pending);
});

// === INFLUENCEURS ===
const INFLUENCEURS_FILE = path.join(__dirname, 'influenceurs.json');
const INF_INTERACTIONS_FILE = path.join(__dirname, 'inf-interactions.json');

// GET influenceurs
app.get('/api/influenceurs', (req, res) => {
  const infs = loadJSON(INFLUENCEURS_FILE, []);
  const interactions = loadJSON(INF_INTERACTIONS_FILE, []);
  const enriched = infs.map((inf, i) => ({
    ...inf,
    _id: inf._id || `inf_${i}`,
    interactions: interactions.filter(x => x.infId === (inf._id || `inf_${i}`)),
  }));
  res.json(enriched);
});

// PATCH influenceur
app.patch('/api/influenceurs/:id', (req, res) => {
  const infs = loadJSON(INFLUENCEURS_FILE, []);
  const idx = infs.findIndex((inf, i) => (inf._id || `inf_${i}`) === req.params.id);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  infs[idx] = { ...infs[idx], ...req.body };
  saveJSON(INFLUENCEURS_FILE, infs);
  res.json(infs[idx]);
});

// POST interaction influenceur
app.post('/api/inf-interactions', (req, res) => {
  const interactions = loadJSON(INF_INTERACTIONS_FILE, []);
  const entry = {
    id: Date.now().toString(),
    infId: req.body.infId,
    type: req.body.type,
    contenu: req.body.contenu,
    date: new Date().toISOString(),
  };
  interactions.push(entry);
  saveJSON(INF_INTERACTIONS_FILE, interactions);
  res.json(entry);
});

app.listen(PORT, () => {
  console.log(`\n✅ CRM Copycraft lancé → http://localhost:${PORT}/crm.html\n`);
  exec(`open http://localhost:${PORT}/crm.html`);
});
