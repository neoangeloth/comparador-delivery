const axios = require('axios');

const RAPPI_HEADERS = {
  'Content-Type': 'application/json',
  'app-version': '1.154.3',
  'vendor': 'rappi',
  'deviceid': '51318a06-8e6d-460e-9b8a-24431876b1b2',
  'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
};

// Token se renueva automáticamente
let rappiToken = 'ft.gAAAAABqB3t3HBJr1VyC2GG5voixS0-b3XEGavuKPnZofCcKkZ2tWlMJqnghSlfrd7csp3yG8NOdcMGlFyiYzE3BvL10O7YXzZacJP0IUfOIElhgjA9irVKuFDGa5rfLiAMOXoyk-l1LwaQyt0OaktwnCR4xNerEDhhG2V8xEKMI2PSFY3_myOApuZt9Son90J8vU-IbzxyGfM64-hnAk5ahEZ2P6gouoOxU1A6PF_EMyOXQ5PA3_rZNUeiC0riP9jvUjOOta0ZdLd3P8EmHFFVbkWoRvD-v2JR17c9AfdBk086jdkoDI_FA9YCn4rBs1tf7HREJSNHD_8MtlJi8Q-me7v9VAhSo7t-GOQBWfY682iNaLivKB_UrBOBvbBKlUShoGTnZEskR6HyRnuMKxf1Ib0xSe4ffLw==';

async function getRappiToken() {
  try {
    const res = await axios.post('https://services.rappi.cl/api/auth/v2/guest-token', {}, {
      headers: { ...RAPPI_HEADERS, 'app-version': '1.154.3' }
    });
    if (res.data?.access_token) {
      rappiToken = res.data.access_token;
      console.log('[rappi] token renovado');
    }
  } catch (e) {
    console.log('[rappi] usando token existente');
  }
}

async function getRappi(query, lat, lng, address) {
  const ciudad = detectarCiudad(lat, address);
  const useLat = lat ? parseFloat(lat) : -33.4489;
  const useLng = lng ? parseFloat(lng) : -70.6693;

  try {
    const res = await axios.post(
      'https://services.rappi.cl/api/pns-global-search-api/v1/unified-search?is_prime=false&unlimited_shipping=false',
      { lat: useLat, lng: useLng, query, options: {} },
      {
        headers: { ...RAPPI_HEADERS, 'Authorization': `Bearer ${rappiToken}` },
        timeout: 10000
      }
    );

    const stores = res.data?.stores || [];
    if (!stores.length) return getFallbackRappi(query, lat, lng, ciudad);

    return stores.slice(0, 4).map(s => {
      const product = s.products?.[0];
      const price = product?.real_price || 5490;
      const discount = product?.discount_value || 0;

      return {
        platform: 'rappi',
        restaurantName: s.store_name,
        productName: product?.name || query,
        price: price,
        deliveryFee: s.shipping_cost || 0,
        discount: discount,
        estimatedTime: s.eta || '25-35 min',
        rating: s.rating || null,
        deepLink: `https://www.rappi.cl/restaurantes/${s.store_id}?utm_source=mejordelivery`,
        imageUrl: s.logo ? `https://images.rappi.cl/restaurants_logo/${s.logo}` : null,
      };
    });

  } catch (err) {
    if (err.response?.status === 401) {
      await getRappiToken();
      return getFallbackRappi(query, lat, lng, ciudad);
    }
    console.log('[rappi api]', err.message);
    return getFallbackRappi(query, lat, lng, ciudad);
  }
}

async function getPedidosYa(query, lat, lng, address) {
  const ciudad = detectarCiudad(lat, address);
  try {
    const useLat = lat || -33.4489;
    const useLng = lng || -70.6693;
    const res = await axios.get(
      `https://www.pedidosya.cl/api/v1/restaurants/search?query=${encodeURIComponent(query)}&lat=${useLat}&lng=${useLng}&limit=5`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'Accept': 'application/json',
          'Accept-Language': 'es-CL',
        },
        timeout: 10000
      }
    );

    const restaurants = res.data?.data || res.data?.restaurants || [];
    if (!restaurants.length) return getFallbackPedidosYa(query, lat, lng, ciudad);

    return restaurants.slice(0, 4).map(r => ({
      platform: 'pedidosya',
      restaurantName: r.name,
      productName: query,
      price: r.minimumOrderValue || 5490,
      deliveryFee: r.deliveryFee || 690,
      discount: r.discountAmount || 0,
      estimatedTime: r.deliveryTime ? r.deliveryTime + ' min' : '20-30 min',
      rating: r.rating || null,
      deepLink: `https://www.pedidosya.cl/restaurantes/${ciudad.slug}/${r.slug || r.id}-menu?utm_source=mejordelivery`,
      imageUrl: r.logoUrl || null,
    }));

  } catch (err) {
    console.log('[pedidosya api]', err.message);
    return getFallbackPedidosYa(query, lat, lng, ciudad);
  }
}

async function getUberEats(query, lat, lng, address) {
  const ciudad = detectarCiudad(lat, address);
  try {
    const useLat = lat || -33.4489;
    const useLng = lng || -70.6693;
    const res = await axios.get(
      `https://www.ubereats.com/api/getSearchSuggestionsV1?query=${encodeURIComponent(query)}&userLat=${useLat}&userLng=${useLng}`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
          'x-csrf-token': 'x',
          'Accept-Language': 'es-CL',
        },
        timeout: 10000
      }
    );

    const items = res.data?.data?.items || [];
    if (!items.length) return getFallbackUberEats(query, lat, lng, ciudad);

    return items.slice(0, 4).map(item => ({
      platform: 'ubereats',
      restaurantName: item.store?.title?.text || item.title?.text || 'Restaurante',
      productName: query,
      price: 5490,
      deliveryFee: item.store?.fareInfo?.deliveryFee || 1190,
      discount: 0,
      estimatedTime: item.store?.etaRange?.text || '20-25 min',
      rating: item.store?.rating?.ratingValue || null,
      deepLink: `https://www.ubereats.com/cl/store/${item.store?.slug || ''}?utm_source=mejordelivery`,
      imageUrl: null,
    }));

  } catch (err) {
    console.log('[ubereats api]', err.message);
    return getFallbackUberEats(query, lat, lng, ciudad);
  }
}

function detectarCiudad(lat, address) {
  if (lat) {
    const laLat = parseFloat(lat);
    if (laLat > -33.1 && laLat < -32.8) return { slug: 'vina-del-mar', nombre: 'Viña del Mar' };
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
  }
  return { slug: 'santiago', nombre: 'Santiago' };
}

function getFallbackRappi(query, lat, lng, ciudad) {
  let url = `https://www.rappi.cl/search?query=${encodeURIComponent(query)}`;
  if (lat && lng) url += `&lat=${lat}&lng=${lng}`;
  return [{ platform: 'rappi', restaurantName: `Ver en Rappi - ${ciudad.nombre}`, productName: query, price: 5490, deliveryFee: 990, discount: 0, estimatedTime: '25-35 min', rating: null, deepLink: url + '&utm_source=mejordelivery', imageUrl: null }];
}

function getFallbackPedidosYa(query, lat, lng, ciudad) {
  return [{ platform: 'pedidosya', restaurantName: `Ver en PedidosYa - ${ciudad.nombre}`, productName: query, price: 5490, deliveryFee: 690, discount: 0, estimatedTime: '20-30 min', rating: null, deepLink: `https://www.pedidosya.cl/restaurantes/${ciudad.slug}?query=${encodeURIComponent(query)}&utm_source=mejordelivery`, imageUrl: null }];
}

function getFallbackUberEats(query, lat, lng, ciudad) {
  let url = `https://www.ubereats.com/cl/search?q=${encodeURIComponent(query)}`;
  if (lat && lng) url += `&userLat=${lat}&userLng=${lng}`;
  return [{ platform: 'ubereats', restaurantName: `Ver en Uber Eats - ${ciudad.nombre}`, productName: query, price: 5490, deliveryFee: 1190, discount: 0, estimatedTime: '20-25 min', rating: null, deepLink: url + '&utm_source=mejordelivery', imageUrl: null }];
}

module.exports = { getRappi, getPedidosYa, getUberEats };