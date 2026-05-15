const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

(async () => {
  const browser = await puppeteer.launch({ headless: false });
  const page = await browser.newPage();
  
  await page.setViewport({ width: 390, height: 844 });
  await page.setUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1');
  
  await page.goto('https://www.rappi.cl/search?query=hamburguesa', { 
    waitUntil: 'networkidle2', timeout: 30000 
  });
  
  await new Promise(r => setTimeout(r, 4000));
  await page.evaluate(() => window.scrollBy(0, 1200));
  await new Promise(r => setTimeout(r, 2000));

  const data = await page.evaluate(() => {
    // Buscar elementos que contengan "min" y "$" cerca — esos son los detalles reales
    const allElements = document.querySelectorAll('p, span, div');
    const withTime = [];
    
    allElements.forEach(el => {
      const text = el.innerText?.trim();
      if (text && text.includes('min') && text.length < 20) {
        const parent = el.closest('a') || el.parentElement?.closest('a');
        const card = el.parentElement?.parentElement?.parentElement;
        withTime.push({
          timeText: text,
          cardText: card?.innerText?.trim().substring(0, 150) || '',
          href: parent?.href || ''
        });
      }
    });
    
    return withTime.slice(0, 8);
  });

  console.log('Elementos con tiempo:');
  data.forEach((r, i) => {
    console.log('---', i+1, '---');
    console.log('Tiempo:', r.timeText);
    console.log('Card:', r.cardText);
    console.log('URL:', r.href);
  });
  
  await browser.close();
})();