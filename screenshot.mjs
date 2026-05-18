import puppeteer from 'puppeteer';

export async function screenshotHtml(html) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await new Promise(r => setTimeout(r, 500));
  const path = `/tmp/after-${Date.now()}.jpg`;
  await page.screenshot({ path, fullPage: false, type: 'jpeg', quality: 82 });
  await browser.close();
  return path;
}

export async function captureAndAnnotate(url, annotations) {
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });

  try {
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 15000 });
  } catch {
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
    } catch {
      // continue with whatever loaded
    }
  }

  // Attendre que la page charge visuellement
  await new Promise(r => setTimeout(r, 3000));

  // Nettoyage des popups cookies — uniquement les vrais overlays cookies
  await page.evaluate(() => {
    const cookieKeywords = ['cookie', 'gdpr', 'consent', 'rgpd', 'accepter les cookies', 'confidentialité', 'nous utilisons des cookies'];

    function containsCookieText(el) {
      try {
        const txt = (el.textContent || '').toLowerCase();
        return cookieKeywords.some(k => txt.includes(k));
      } catch { return false; }
    }

    // 1. Cliquer sur les boutons d'acceptation dans les blocs cookies uniquement
    document.querySelectorAll('button, a[role="button"], [role="button"], input[type="button"]').forEach(el => {
      try {
        const txt = (el.textContent || el.value || '').toLowerCase().trim();
        const acceptTexts = ['tout accepter', 'accepter tout', "j'accepte", 'accept all', 'accepter', 'accept', 'agree', 'i agree', 'ok', 'got it'];
        if (acceptTexts.some(t => txt === t || txt.startsWith(t))) el.click();
      } catch {}
    });

    // 2. Supprimer UNIQUEMENT les éléments qui ont un id/class spécifique cookies ET contiennent du texte cookie
    const safeSelectors = [
      '[id="cookie-banner"]', '[id="cookie-notice"]', '[id="cookie-consent"]',
      '[id="gdpr-banner"]', '[id="consent-banner"]', '[id="cookieConsent"]',
      '[class="cookie-banner"]', '[class="cookie-notice"]', '[class="cookie-bar"]',
      '.cookie-modal', '.gdpr-modal', '.consent-modal',
      '#onetrust-banner-sdk', '#cookiebanner', '#cookie-law-info-bar',
    ];
    safeSelectors.forEach(sel => {
      try {
        document.querySelectorAll(sel).forEach(el => {
          try { el.remove(); } catch {}
        });
      } catch {}
    });

    // 3. Restaurer le scroll
    try {
      document.body.style.overflow = 'auto';
      document.documentElement.style.overflow = 'auto';
    } catch {}
  });

  // Attendre que le DOM soit stable après le nettoyage
  await new Promise(r => setTimeout(r, 1000));
  try { await page.waitForSelector('body', { timeout: 5000 }); } catch {}

  // Injecter les annotations visuelles
  await page.evaluate((annotations) => {
    const body = document.body || document.documentElement;
    if (!body) return;

    // Bandeau titre en haut
    try {
      const banner = document.createElement('div');
      banner.style.cssText = 'position:fixed;top:0;left:0;right:0;background:rgba(26,26,26,0.92);color:white;font-family:Arial,sans-serif;font-size:13px;padding:10px 20px;z-index:999999;display:flex;align-items:center;gap:12px;';
      banner.innerHTML = '<span style="font-weight:bold;letter-spacing:1px;">THE COPY CRAFT</span><span style="color:#e8944a;"> · </span><span style="color:#ccc;">Analyse de votre site — ' + new Date().toLocaleDateString('fr-FR') + '</span>';
      body.appendChild(banner);
    } catch {}

    // Ajouter chaque annotation
    const colors = ['#e8944a', '#4a9ee8', '#4ae87a'];
    annotations.forEach((ann, i) => {
      try {
        const color = colors[i % colors.length];
        const badge = document.createElement('div');
        badge.style.cssText = 'position:fixed;top:' + ann.y + '%;left:' + ann.x + '%;z-index:999999;display:flex;align-items:flex-start;gap:8px;max-width:280px;pointer-events:none;';
        badge.innerHTML =
          '<div style="min-width:28px;height:28px;border-radius:50%;background:' + color + ';color:white;font-family:Arial,sans-serif;font-weight:bold;font-size:14px;display:flex;align-items:center;justify-content:center;flex-shrink:0;box-shadow:0 2px 8px rgba(0,0,0,0.3);">' + (i + 1) + '</div>' +
          '<div style="background:rgba(26,26,26,0.88);color:white;font-family:Arial,sans-serif;font-size:12px;line-height:1.5;padding:10px 14px;border-radius:6px;border-left:3px solid ' + color + ';box-shadow:0 2px 12px rgba(0,0,0,0.3);">' + ann.text + '</div>';
        body.appendChild(badge);
      } catch {}
    });
  }, annotations);

  await new Promise(r => setTimeout(r, 500));

  const screenshotPath = `/tmp/audit-${Date.now()}.jpg`;
  await page.screenshot({ path: screenshotPath, fullPage: false, type: 'jpeg', quality: 82 });

  await browser.close();
  return screenshotPath;
}
