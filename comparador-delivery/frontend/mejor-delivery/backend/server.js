const express = require('express');
const cors = require('cors');
const path = require('path');

const scraper = require('./scraper');
const comparator = require('./comparator');
const cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// ──────────────────────────────────────────
// RUTA PRINCIPAL: buscar y comparar ofertas
// ──────────────────────────────────────────
app.get('/api/search', async (req, res) => {
  const { query, city } = req.query;

  if (!query) {
    return res.status(400).json({ error: 'Falta el parámetro "query"' });
  }

  const cacheKey = `${query}-${city || 'default'}`;

  // Si ya buscamos esto hace menos de 5 minutos, devolvemos el caché
  const cached = cache.get(cacheKey);
  if (cached) {
    console.log(`[caché] Resultado para "${query}"`);
    return res.json({ source: 'cache', results: cached });
  }

  try {
    console.log(`[búsqueda] "${query}" en ${city || 'ciudad por defecto'}`);

    // Llama a los scrapers en paralelo (no bloquea si uno falla)
    const [rappi, pedidosya, ubereats] = await Promise.allSettled([
      scraper.getRappi(query, city),
      scraper.getPedidosYa(query, city),
      scraper.getUberEats(query, city),
    ]);

    // Junta solo los que respondieron bien
    const rawResults = [
      ...(rappi.status === 'fulfilled' ? rappi.value : []),
      ...(pedidosya.status === 'fulfilled' ? pedidosya.value : []),
      ...(ubereats.status === 'fulfilled' ? ubereats.value : []),
    ];

    if (rawResults.length === 0) {
      return res.status(503).json({ error: 'No se obtuvieron resultados de ninguna plataforma' });
    }

    // Rankea por mejor precio final (producto + envío - descuento)
    const ranked = comparator.rank(rawResults);

    // Guarda en caché por 5 minutos
    cache.set(cacheKey, ranked, 300);

    res.json({ source: 'live', results: ranked });
  } catch (err) {
    console.error('[error]', err.message, err.stack);
    res.status(500).json({ error: err.message });
  }
});

// ──────────────────────────────────────────
// RUTA DE SALUD: para verificar que corre
// ──────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Cualquier otra ruta devuelve el frontend
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});res.status(500).json({ error: err.message, stack: err.stack });
