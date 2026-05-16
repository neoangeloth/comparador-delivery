const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

async function getBrowser() {
  return await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu'],
  });
}

async function getRappi(query, lat, lng) {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

    await page.goto(`https://www.rappi.cl/search?query=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2', timeout: 25000
    });

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

    if (!results.length) return getFallbackRappi(query, lat, lng);

    return results.map(r => ({
      platform: 'rappi',
      restaurantName: r.name,
      productName: query,
      price: 5490,
      deliveryFee: parseDelivery(r.feeLine),
      discount: parseDiscount(r.discountLine, 5490),
      estimatedTime: r.timeLine || '25-35 min',
      rating: parseRating(r.ratingLine),
      deepLink: r.href + '?utm_source=mejordelivery',
      imageUrl: null,
    }));

  } catch (err) {
    console.log('[rappi]', err.message);
    return getFallbackRappi(query, lat, lng);
  } finally {
    if (browser) await browser.close();
  }
}

async function getPedidosYa(query, lat, lng) {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

    await page.goto(`https://www.pedidosya.cl/restaurantes/santiago?query=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2', timeout: 25000
    });

    await new Promise(r => setTimeout(r, 3000));
    await page.evaluate(() => window.scrollBy(0, 800));
    await new Promise(r => setTimeout(r, 2000));

    const results = await page.evaluate(() => {
      const seen = new Set();
      const items = [];

      document.querySelectorAll('a[href*="/restaurantes/"]').forEach(link => {
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

    if (!results.length) return getFallbackPedidosYa(query, lat, lng);

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
      imageUrl: null,
    }));

  } catch (err) {
    console.log('[pedidosya]', err.message);
    return getFallbackPedidosYa(query, lat, lng);
  } finally {
    if (browser) await browser.close();
  }
}

async function getUberEats(query, lat, lng) {
  let browser;
  try {
    browser = await getBrowser();
    const page = await browser.newPage();
    await page.setViewport({ width: 390, height: 844 });
    await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');

    await page.goto(`https://www.ubereats.com/cl/search?q=${encodeURIComponent(query)}`, {
      waitUntil: 'networkidle2', timeout: 25000
    });

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

    if (!results.length) return getFallbackUberEats(query, lat, lng);

    return results.map(r => ({
      platform: 'ubereats',
      restaurantName: r.name,
      productName: query,
      price: 5490,
      deliveryFee: parseDelivery(r.feeLine),
      discount: 0,
      estimatedTime: r.timeLine || '20-25 min',
      rating: parseRating(r.ratingLine),
      deepLink: r.href + '?utm_source=mejordelivery',
      imageUrl: null,
    }));

  } catch (err) {
    console.log('[ubereats]', err.message);
    return getFallbackUberEats(query, lat, lng);
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

function getFallbackRappi(query, lat, lng) {
  let url = `https://www.rappi.cl/search?query=${encodeURIComponent(query)}`;
  if (lat && lng) url += `&lat=${lat}&lng=${lng}`;
  return [{ platform: 'rappi', restaurantName: 'Ver resultados en Rappi', productName: query, price: 5490, deliveryFee: 990, discount: 0, estimatedTime: '25-35 min', rating: null, deepLink: url + '&utm_source=mejordelivery', imageUrl: null }];
}

function getFallbackPedidosYa(query, lat, lng) {
  let ciudad = 'vina-del-mar';
  if (lat) {
    const laLat = parseFloat(lat);
    if (laLat < -33.3) ciudad = 'santiago';
    else if (laLat < -32.5) ciudad = 'vina-del-mar';
  }
  // Deep link directo a la app de PedidosYa
  const appLink = `pedidosya://search?query=${encodeURIComponent(query)}&city=${ciudad}`;
  // Fallback web si no tiene la app
  const webLink = `https://www.pedidosya.cl/restaurantes/${ciudad}/${encodeURIComponent(query)}`;
  return [{
    platform: 'pedidosya',
    restaurantName: 'Ver resultados en PedidosYa',
    productName: query,
    price: 5490,
    deliveryFee: 690,
    discount: 0,
    estimatedTime: '20-30 min',
    rating: null,
    deepLink: appLink,
    webLink: webLink,
    imageUrl: null,
  }];
}
  const base = `https://www.pedidosya.cl/restaurantes/${ciudad}?query=${encodeURIComponent(query)}`;
  return [{ platform: 'pedidosya', restaurantName: 'Ver resultados en PedidosYa', productName: query, price: 5490, deliveryFee: 690, discount: 0, estimatedTime: '20-30 min', rating: null, deepLink: base + '&utm_source=mejordelivery', imageUrl: null }];
}

function getFallbackUberEats(query, lat, lng) {
  let url = `https://www.ubereats.com/cl/search?q=${encodeURIComponent(query)}`;
  if (lat && lng) url += `&userLat=${lat}&userLng=${lng}`;
  return [{ platform: 'ubereats', restaurantName: 'Ver resultados en Uber Eats', productName: query, price: 5490, deliveryFee: 1190, discount: 0, estimatedTime: '20-25 min', rating: null, deepLink: url + '&utm_source=mejordelivery', imageUrl: null }];
}

module.exports = { getRappi, getPedidosYa, getUberEats };