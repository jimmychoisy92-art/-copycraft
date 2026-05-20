import fs from 'fs';
import nodemailer from 'nodemailer';

const CRM_FILE = './leads.json';

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

function getEmailJ0(nom) {
  return {
    subject: `J'ai regardé le site de ${nom} — voici ce que j'ai trouvé`,
    text: `Bonjour,

J'ai visité le site de ${nom} et j'ai repéré 3 points qui freinent probablement vos réservations en ligne.

1. Votre titre principal ne dit pas ce que vous apportez — une visiteuse qui arrive sur votre site ne comprend pas en 3 secondes pourquoi elle devrait choisir votre institut plutôt qu'un autre.

2. Pas d'appel à l'action visible — vos clientes potentielles ne savent pas quoi faire après avoir lu votre page. Prendre rendez-vous devrait s'imposer naturellement.

3. Les bénéfices de vos soins ne sont pas mis en avant — vous décrivez vos prestations, mais pas ce que vos clientes ressentent après. C'est ce qui déclenche la réservation.

Je suis copywriter spécialisé dans les centres esthétiques. Je réécris les pages de sites pour transformer les visiteuses en clientes.

Si vous voulez, je vous envoie une version retravaillée de votre page d'accueil gratuitement. Sans engagement.

Bonne journée,

TheCopyCraft
contact@thecopycraft.fr`,
  };
}

function getEmailJ3(nom) {
  return {
    subject: `Re : site de ${nom}`,
    text: `Bonjour,

Je vous ai écrit il y a quelques jours au sujet de votre site.

Mon offre tient toujours : je vous envoie une version améliorée de votre page d'accueil gratuitement.

Ça prend 2 minutes à lire et ça pourrait vous ramener plusieurs clientes supplémentaires par mois.

Intéressée ?

TheCopyCraft
contact@thecopycraft.fr`,
  };
}

function getEmailJ7(nom) {
  return {
    subject: `Dernière prise de contact — ${nom}`,
    text: `Bonjour,

Dernière prise de contact de ma part.

Mon offre tient toujours : je réécris votre page d'accueil gratuitement pour vous montrer ce que ça peut donner.

Si ce n'est pas le bon moment, pas de souci.

TheCopyCraft
contact@thecopycraft.fr`,
  };
}

async function sendEmail(to, subject, text) {
  await transporter.sendMail({
    from: '"TheCopyCraft" <contact@thecopycraft.fr>',
    to,
    subject,
    text,
  });
}

async function main() {
  const leads = loadCRM();
  const today = new Date().toISOString().split('T')[0];

  // Filtrer les leads avec email direct (pas plateformes)
  const platformes = ['planity.com', 'treatwell.fr', 'fresha.com'];
  const cibles = leads.filter(l => {
    if (!l.email) return false;
    if (platformes.some(p => l.email.includes(p))) return false;
    return true;
  });

  console.log(`📧 ${cibles.length} leads avec email direct\n`);

  let envoyes = 0;

  for (const lead of cibles) {
    const daysSinceAdded = lead.date_contact
      ? Math.floor((new Date(today) - new Date(lead.date_contact)) / 86400000)
      : 0;

    let emailContent = null;
    let nouveauStatut = null;

    if (lead.statut === 'à_contacter') {
      emailContent = getEmailJ0(lead.nom);
      nouveauStatut = 'j0_envoyé';
    } else if (lead.statut === 'j0_envoyé' && daysSinceAdded >= 3) {
      emailContent = getEmailJ3(lead.nom);
      nouveauStatut = 'j3_envoyé';
    } else if (lead.statut === 'j3_envoyé' && daysSinceAdded >= 7) {
      emailContent = getEmailJ7(lead.nom);
      nouveauStatut = 'j7_envoyé';
    }

    if (!emailContent) continue;

    try {
      await sendEmail(lead.email, emailContent.subject, emailContent.text);
      lead.statut = nouveauStatut;
      lead.date_contact = today;
      saveCRM(leads);
      envoyes++;
      console.log(`✅ Envoyé à ${lead.nom} (${lead.email}) — ${nouveauStatut}`);

      // Délai aléatoire anti-spam (30-90 secondes)
      const delai = 30000 + Math.random() * 60000;
      await sleep(delai);
    } catch (err) {
      console.log(`❌ Erreur ${lead.nom} : ${err.message}`);
    }
  }

  console.log(`\n✅ Terminé — ${envoyes} emails envoyés`);
}

main().catch(console.error);
