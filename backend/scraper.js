const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}

function detectarCiudad(lat, address) {
  if (lat) {
    const laLat = parseFloat(lat);
    if (laLat > -33.1 && laLat < -32.8) return { slug: 'vina-del-mar', nombre: 'Viña del Mar' };
    if (laLat > -33.5 && laLat < -33.3) return { slug: 'santiago', nombre: 'Santiago' };
    if (laLat > -33.1 && laLat < -32.9) return { slug: 'valparaiso', nombre: 'Valparaíso' };
    if (laLat > -36.9 && laLat < -36.7) return { slug: 'concepcion', nombre: 'Concepción' };
    if (laLat > -38.8 && laLat < -38.6) return { slug: 'temuco', nombre: 'Temuco' };
    if (laLat > -23.7 && laLat < -23.5) return { slug: 'antofagasta', nombre: 'Antofagasta' };
    if (laLat > -20.3 && laLat < -20.1) return { slug: 'iquique', nombre: 'Iquique' };
  }
  if (address) {
    const a = address.toLowerCase();
    if (a.includes('viña') || a.includes('vina')) return { slug: 'vina-del-mar', nombre: 'Viña del Mar' };
    if (a.includes('valparaíso') || a.includes('valparaiso')) return { slug: 'valparaiso', nombre: 'Valparaíso' };
    if (a.includes('concepción') || a.includes('concepcion')) return { slug: 'concepcion', nombre: 'Concepción' };
    if (a.includes('temuco')) return { slug: 'temuco', nombre: 'Temuco' };
    if (a.includes('antofagasta')) return { slug: 'antofagasta', nombre: 'Antofagasta' };
    if (a.includes('iquique')) return { slug: 'iquique', nombre: 'Iquique' };
  }
  return { slug: 'santiago', nombre: 'Santiago' };
}

async function getRappi(query, lat, lng, address) {
  let browser;
  const ciudad = detectarCiudad(lat, address);
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

    // URL con coordenadas reales del usuario
    let url = `https://www.rappi.cl/search?query=${encodeURIComponent(query)}`;
    if (lat && lng) url += `&lat=${lat}&lng=${lng}`;

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.evaluate(() => window.scrollBy(0, 1200));
    await new Promise(r => setTimeout(r, 2000));

    const results = await page.evaluate(() => {
      const seen = new Set();
      const items = [];
      document.querySelectorAll('a[href*="/restaurantes/"]').forEach(link => {
        const href = link.href;
        if (seen.has(href)) return;
        const card = link.closest('li, article') || link;
        const text = card.innerText?.trim() || link.innerText?.trim();
        if (!text || text.length < 5) return;
        const lines = text.split(/\n|•/).map(l => l.trim()).filter(l => l);
        const name = lines[0];
        const timeLine = lines.find(l => l.includes('min')) || '';
        const feeLine = lines.find(l => l.includes('$')) || '';
        const ratingLine = lines.find(l => /^\d[\.,]\d$/.test(l)) || '';
        const discountLine = lines.find(l => l.includes('%')) || '';
        if (name && name.length > 3) {
          seen.add(href);
          items.push({ name, timeLine, feeLine, ratingLine, discountLine, href });
        }
      });
      return items.slice(0, 4);
    });

    if (!results.length) return getFallbackRappi(query, lat, lng, ciudad);

    return results.map(r => ({
      platform: 'rappi',
      restaurantName: r.name,
      productName: query,
      price: 5490,
      deliveryFee: parseDelivery(r.feeLine),
      discount: parseDiscount(r.discountLine, 5490),
      estimatedTime: r.timeLine || '25-35 min',
      rating: parseRating(r.ratingLine),
      deepLink: r.href + `?utm_source=mejordelivery${lat ? `&lat=${lat}&lng=${lng}` : ''}`,
      imageUrl: null,
    }));

  } catch (err) {
    console.log('[rappi]', err.message);
    return getFallbackRappi(query, lat, lng, ciudad);
  } finally {
    if (browser) await browser.close();
  }
}

async function getPedidosYa(query, lat, lng, address) {
  let browser;
  const ciudad = detectarCiudad(lat, address);
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

    // URL con ciudad real detectada por GPS
    const url = `https://www.pedidosya.cl/restaurantes/${ciudad.slug}?query=${encodeURIComponent(query)}`;
    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(r => setTimeout(r, 2000));

    const results = await page.evaluate(() => {
      const seen = new Set();
      const items = [];
      document.querySelectorAll('a[href*="/restaurantes/"]').forEach(link => {
        const href = link.href;
        if (seen.has(href) || href.includes('?')) return;
        const text = link.innerText?.trim();
        if (!text || text.length < 5) return;
        const lines = text.split(/\n|•/).map(l => l.trim()).filter(l => l);
        const name = lines[0];
        const timeLine = lines.find(l => l.includes('min')) || '';
        const feeLine = lines.find(l => l.includes('$') || l.toLowerCase().includes('gratis')) || '';
        const ratingLine = lines.find(l => /^\d[\.,]\d$/.test(l)) || '';
        if (name && name.length > 3) {
          seen.add(href);
          items.push({ name, timeLine, feeLine, ratingLine, href });
        }
      });
      return items.slice(0, 4);
    });

    if (!results.length) return getFallbackPedidosYa(query, lat, lng, ciudad);

    return results.map(r => ({
      platform: 'pedidosya',
      restaurantName: r.name,
      productName: query,
      price: 5490,
      deliveryFee: parseDelivery(r.feeLine),
      discount: 0,
      estimatedTime: r.timeLine || '20-30 min',
      rating: parseRating(r.ratingLine),
      deepLink: r.href + '?utm_source=mejordelivery',
      appLink: `pedidosya://search?query=${encodeURIComponent(query)}&city=${ciudad.slug}`,
      imageUrl: null,
    }));

  } catch (err) {
    console.log('[pedidosya]', err.message);
    return getFallbackPedidosYa(query, lat, lng, ciudad);
  } finally {
    if (browser) await browser.close();
  }
}

async function getUberEats(query, lat, lng, address) {
  let browser;
  const ciudad = detectarCiudad(lat, address);
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

    let url = `https://www.ubereats.com/cl/search?q=${encodeURIComponent(query)}`;
    if (lat && lng) url += `&userLat=${lat}&userLng=${lng}`;

    await page.goto(url, { waitUntil: 'networkidle2', timeout: 25000 });
    await new Promise(r => setTimeout(r, 3000));
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(r => setTimeout(r, 2000));

    const results = await page.evaluate(() => {
      const seen = new Set();
      const items = [];
      document.querySelectorAll('a[href*="/cl/store/"], a[href*="/store/"]').forEach(link => {
        const href = link.href;
        if (seen.has(href)) return;
        const text = link.innerText?.trim();
        if (!text || text.length < 5) return;
        const lines = text.split(/\n|•/).map(l => l.trim()).filter(l => l);
        const name = lines[0];
        const timeLine = lines.find(l => l.includes('min')) || '';
        const feeLine = lines.find(l => l.includes('$') || l.toLowerCase().includes('gratis')) || '';
        const ratingLine = lines.find(l => /^\d[\.,]\d$/.test(l)) || '';
        if (name && name.length > 3) {
          seen.add(href);
          items.push({ name, timeLine, feeLine, ratingLine, href });
        }
      });
      return items.slice(0, 4);
    });

    if (!results.length) return getFallbackUberEats(query, lat, lng, ciudad);

    return results.map(r => ({
      platform: 'ubereats',
      restaurantName: r.name,
      productName: query,
      price: 5490,
      deliveryFee: parseDelivery(r.feeLine),
      discount: 0,
      estimatedTime: r.timeLine || '20-25 min',
      rating: parseRating(r.ratingLine),
      deepLink: r.href + `?utm_source=mejordelivery${lat ? `&userLat=${lat}&userLng=${lng}` : ''}`,
      imageUrl: null,
    }));

  } catch (err) {
    console.log('[ubereats]', err.message);
    return getFallbackUberEats(query, lat, lng, ciudad);
  } finally {
    if (browser) await browser.close();
  }
}

function parseDelivery(text) {
  if (!text) return 990;
  if (text.toLowerCase().includes('gratis') || text.includes('$ 0') || text.includes('$0')) return 0;
  const match = text.replace(/\./g, '').match(/\d+/);
  return match ? parseInt(match[0]) : 990;
}

function parseRating(text) {
  if (!text) return null;
  const match = text.match(/[\d,]+/);
  return match ? parseFloat(match[0].replace(',', '.')) : null;
}

function parseDiscount(text, price) {
  if (!text) return 0;
  const match = text.match(/(\d+)%/);
  if (!match) return 0;
  return Math.round(price * parseInt(match[1]) / 100);
}

function getFallbackRappi(query, lat, lng, ciudad) {
  let url = `https://www.rappi.cl/search?query=${encodeURIComponent(query)}`;
  if (lat && lng) url += `&lat=${lat}&lng=${lng}`;
  return [{ platform: 'rappi', restaurantName: `Ver resultados en Rappi - ${ciudad.nombre}`, productName: query, price: 5490, deliveryFee: 990, discount: 0, estimatedTime: '25-35 min', rating: null, deepLink: url + '&utm_source=mejordelivery', imageUrl: null }];
}

function getFallbackPedidosYa(query, lat, lng, ciudad) {
  const webUrl = `https://www.pedidosya.cl/restaurantes/${ciudad.slug}?query=${encodeURIComponent(query)}&utm_source=mejordelivery`;
  const appUrl = `pedidosya://search?query=${encodeURIComponent(query)}&city=${ciudad.slug}`;
  return [{ platform: 'pedidosya', restaurantName: `Ver resultados en PedidosYa - ${ciudad.nombre}`, productName: query, price: 5490, deliveryFee: 690, discount: 0, estimatedTime: '20-30 min', rating: null, deepLink: webUrl, appLink: appUrl, imageUrl: null }];
}

function getFallbackUberEats(query, lat, lng, ciudad) {
  let url = `https://www.ubereats.com/cl/search?q=${encodeURIComponent(query)}`;
  if (lat && lng) url += `&userLat=${lat}&userLng=${lng}`;
  return [{ platform: 'ubereats', restaurantName: `Ver resultados en Uber Eats - ${ciudad.nombre}`, productName: query, price: 5490, deliveryFee: 1190, discount: 0, estimatedTime: '20-25 min', rating: null, deepLink: url + '&utm_source=mejordelivery', imageUrl: null }];
}

module.exports = { getRappi, getPedidosYa, getUberEats };