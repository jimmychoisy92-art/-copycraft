# CAHIER DES CHARGES — The Copy Craft
## Système d'audit automatisé multi-services

---

## 1. OBJECTIF

Pour chaque lead (salon, restaurant, esthéticienne, spa, clinique, archi) :
1. Faire un audit réel et sérieux de leur présence en ligne
2. Identifier précisément ce qui manque ou est mal fait
3. Envoyer un email ultra-personnalisé avec uniquement l'offre qui correspond à leur situation
4. Ne jamais envoyer un email générique ou avec des erreurs

---

## 2. RÈGLES ABSOLUES

- **Zéro erreur tolérée** — vérifier chaque donnée avant d'envoyer
- **Un email = un problème précis** — pas de liste de tout ce qui manque
- **Vouvoiement obligatoire** — toujours
- **Ton sobre et direct** — pas de "votre retour me touche", pas de tirets
- **Prouver le sérieux** — citer des éléments réels et vérifiables de leur présence en ligne
- **Ne jamais envoyer si les données sont incomplètes** — mieux vaut skip un lead que d'envoyer une erreur
- **Un lead = un seul email** — ne jamais contacter deux fois le même email

---

## 3. PIPELINE D'AUDIT PAR LEAD

### ÉTAPE 1 — Vérification Google My Business (GMB)
**Outil** : Google Places API (clé : AIzaSyBGPC9dY5UXQrfDSwevc_A9YLJyhJmbMp4)
**Ce qu'on vérifie** :
- [ ] La fiche GMB existe-t-elle ? (recherche par nom + ville)
- [ ] Note moyenne (sur 5)
- [ ] Nombre d'avis
- [ ] Photos présentes ? (nombre)
- [ ] Description remplie ?
- [ ] Horaires renseignés ?
- [ ] Site web lié ?

**Scoring GMB** :
- Pas de fiche → `gmb: "absent"`
- Fiche existe mais < 10 avis, pas de description, pas de photos → `gmb: "non_optimisee"`
- Fiche complète, > 20 avis, description + photos → `gmb: "optimisee"`

---

### ÉTAPE 2 — Vérification Site Web
**Outil** : Puppeteer + fetch
**Ce qu'on vérifie** :
- [ ] Site web existe ? (champ `website` dans leads-all.json)
- [ ] Site accessible ? (pas de 404/timeout)
- [ ] Temps de chargement (> 5s = problème)
- [ ] Mobile-friendly ? (viewport test)
- [ ] Texte H1 présent et pertinent ?
- [ ] CTA visible dans les 900 premiers pixels ?
- [ ] Mentions légales présentes ?
- [ ] Formulaire de contact ou bouton réservation ?
- [ ] Dernière mise à jour (si blog/news visible)

**Scoring Site** :
- Pas de site → `site: "absent"`
- Site existe mais pas de CTA, textes faibles, pas mobile → `site: "non_optimise"`
- Site complet avec CTA, textes clairs, mobile → `site: "optimise"`

---

### ÉTAPE 3 — Vérification Réseaux Sociaux
**Outil** : Google Search (`site:instagram.com "nom"` + `site:facebook.com "nom"`)
**Ce qu'on vérifie** :
- [ ] Compte Instagram trouvé ? (recherche Google)
- [ ] Compte Facebook trouvé ?
- [ ] Nombre de posts estimé (si accessible)
- [ ] Dernier post récent ? (< 30 jours = actif)

**Scoring Réseaux** :
- Aucun réseau trouvé → `reseaux: "absent"`
- Compte trouvé mais inactif (> 3 mois sans post) → `reseaux: "inactif"`
- Compte actif → `reseaux: "actif"`

---

## 4. MATRICE DES EMAILS À ENVOYER

| GMB | Site | Réseaux | Email à envoyer |
|-----|------|---------|-----------------|
| absent | — | — | **Email A** : Création fiche GMB |
| non_optimisee | — | — | **Email B** : Optimisation GMB |
| optimisee | absent | — | **Email C** : Création site web (mockup générique secteur) |
| optimisee | non_optimise | — | **Email D** : Refonte site (mockup personnalisé = système actuel) |
| optimisee | optimise | absent | **Email E** : Création réseaux sociaux |
| optimisee | optimise | inactif | **Email F** : Gestion contenu réseaux |
| optimisee | optimise | actif | **Email G** : Audit copywriting textes site |

**Priorité** : GMB > Site > Réseaux (on traite le problème le plus basique en premier)

---

## 5. TEMPLATES EMAILS

### Email A — Pas de fiche GMB
**Objet** : `[Nom] — votre établissement n'apparaît pas sur Google Maps`
**Accroche** : "En cherchant [nom] sur Google Maps, votre établissement n'apparaît pas. Chaque jour, des clients potentiels vous cherchent et ne vous trouvent pas."
**Offre** : Création + optimisation fiche GMB — 150€

### Email B — GMB non optimisée
**Objet** : `Votre fiche Google — 3 points qui font fuir vos clients`
**Accroche** : Citer les vrais problèmes détectés (ex: "Votre fiche a seulement X avis et pas de description — c'est la première chose que voit un client avant de choisir.")
**Offre** : Optimisation GMB complète — 150€

### Email C — Pas de site web
**Objet** : `[Nom] — voici à quoi pourrait ressembler votre site`
**Accroche** : "Vous n'avez pas encore de site web. Voici une direction possible pour [secteur]."
**Visuel** : Mockup générique par secteur (pré-généré une fois par secteur)
**Offre** : Création site vitrine — 800€

### Email D — Site non optimisé
**Objet** : `Votre site — quelques pistes pour plus de réservations` (système actuel)
**= système campaign.mjs déjà en place**

### Email E — Pas de réseaux
**Objet** : `[Nom] — vos concurrents sont sur Instagram, pas vous`
**Accroche** : "Vos concurrents directs publient régulièrement sur Instagram et captent des clients que vous pourriez avoir."
**Offre** : Création + stratégie réseaux — 300€

### Email F — Réseaux inactifs
**Objet** : `Votre Instagram — le dernier post date de X mois`
**Accroche** : Citer la date réelle du dernier post
**Offre** : Gestion contenu mensuel — 300€/mois

### Email G — Tout est OK, copywriting à améliorer
**Objet** : `Vos textes — ce qui freine encore vos réservations`
**= version améliorée du système actuel, focus textes uniquement**

---

## 6. CLÉS API ET OUTILS

### APIs
- **Google Places** : `AIzaSyBGPC9dY5UXQrfDSwevc_A9YLJyhJmbMp4`
- **Hunter.io** : `f761e4209f97623150e563ea2b284d87629ef090`
- **Anthropic (Claude Sonnet)** : `REDACTED`
- **Groq (llama-3.3-70b)** : `REDACTED`

### SMTP
- **Email** : contact@thecopycraft.fr
- **Serveur** : ssl0.ovh.net
- **Port** : 465 (SSL)
- **Mot de passe** : pompiers94Creteil.

### Fichiers
- **Leads** : `/Users/jimmychoisy/dev/copycraft/leads-all.json`
- **Log campagne** : `/Users/jimmychoisy/dev/copycraft/campaign-log.json`
- **Interactions CRM** : `/Users/jimmychoisy/dev/copycraft/crm-interactions.json`
- **Rappels CRM** : `/Users/jimmychoisy/dev/copycraft/crm-reminders.json`

### Scripts existants
- `campaign.mjs` — campagne email site non optimisé (Email D)
- `crm-server.mjs` — serveur CRM port 4567
- `screenshot.mjs` — capture + annotation Puppeteer
- `prospect-multi.mjs` — scraping Google Places

---

## 7. RÈGLES ANTI-ERREURS

1. **Toujours vérifier** que `lead.email` existe avant d'envoyer
2. **Toujours vérifier** que le lead n'est pas déjà dans `campaign-log.json`
3. **Statuts à ne jamais contacter** : refus, bounce, sans_suite, j0_envoyé, j3_relance, j7_relance, répondu, intéressé, rdv_planifié, vendu, payé
4. **Si audit incomplet** (site timeout, GMB non trouvé) → logguer l'erreur et passer au lead suivant, ne pas envoyer
5. **Retry Claude 529** → 3 tentatives espacées de 30s
6. **Maximum 30 emails/jour/secteur**
7. **2 minutes minimum entre chaque envoi**

---

## 8. TARIFS

| Service | Prix |
|---------|------|
| Création fiche GMB | 150€ |
| Optimisation GMB | 150€ |
| Création site vitrine | 800€ |
| Refonte site + copywriting | 500-1000€ |
| Création réseaux sociaux | 300€ |
| Gestion contenu mensuel | 300€/mois |
| Audit copywriting complet | 200€ |
| Séquence emails clients | 300€ |

---

## 9. ORDRE DE DÉVELOPPEMENT

- [x] Email D — Refonte site (campaign.mjs) ✅ EN PRODUCTION
- [ ] Audit pipeline (gmb + site + réseaux) → `audit.mjs`
- [ ] Email A — Pas de GMB
- [ ] Email B — GMB non optimisée
- [ ] Email C — Pas de site (mockups génériques par secteur)
- [ ] Email E/F — Réseaux absents/inactifs
- [ ] Email G — Tout OK, copywriting
