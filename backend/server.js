const express = require('express');
const cors = require('cors');
const path = require('path');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const scraper = require('./scraper');
const comparator = require('./comparator');
const cache = require('./cache');

const app = express();
const PORT = process.env.PORT || 3000;

// ── SEGURIDAD ──
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());
app.use(express.json());

// Máximo 30 búsquedas por minuto por IP
const limiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  message: { error: 'Demasiadas solicitudes, espera un momento.' }
});
app.use('/api/', limiter);

// ── ARCHIVOS ESTÁTICOS ──
app.use(express.static(path.join(__dirname, '../frontend')));

// ── BÚSQUEDA ──
app.get('/api/search', async (req, res) => {
  const { query, city } = req.query;

  if (!query || query.trim().length < 2) {
    return res.status(400).json({ error: 'Escribe al menos 2 caracteres' });
  }

  if (query.length > 100) {
    return res.status(400).json({ error: 'Búsqueda demasiado larga' });
  }

  const cacheKey = query.trim().toLowerCase() + '-' + (city || 'default');
  const cached = cache.get(cacheKey);
  if (cached) {
    return res.json({ source: 'cache', results: cached });
  }

  try {
    const [rappiResult, pedidosyaResult, ubereatsResult] = await Promise.allSettled([
      scraper.getRappi(query, city),
      scraper.getPedidosYa(query, city),
      scraper.getUberEats(query, city),
    ]);

    const rawResults = [
      ...(rappiResult.status === 'fulfilled' ? rappiResult.value : []),
      ...(pedidosyaResult.status === 'fulfilled' ? pedidosyaResult.value : []),
      ...(ubereatsResult.status === 'fulfilled' ? ubereatsResult.value : []),
    ];

    const ranked = comparator.rank(rawResults);
    cache.set(cacheKey, ranked, 300);

    return res.json({ source: 'live', results: ranked });

  } catch (err) {
    console.error('[error]', err.message);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ── SALUD ──
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── FRONTEND ──
app.get('/{*path}', (req, res) => {
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

app.listen(PORT, () => {
  console.log(`✅ Servidor seguro corriendo en http://localhost:${PORT}`);
});