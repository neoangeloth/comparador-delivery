// cache.js — almacena resultados en memoria para no golpear las plataformas
// en cada búsqueda. Los datos viven mientras el servidor esté corriendo.

const store = new Map();

function get(key) {
  const entry = store.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    store.delete(key);
    return null;
  }
  return entry.data;
}

function set(key, data, ttlSeconds = 300) {
  store.set(key, {
    data,
    expiresAt: Date.now() + ttlSeconds * 1000,
  });
}

function clear() {
  store.clear();
}

module.exports = { get, set, clear };