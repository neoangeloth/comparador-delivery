const MOCK_DELAY = 400;

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function getRappi(query, city) {
  await delay(MOCK_DELAY);
  return [
    {
      platform: 'rappi',
      restaurantName: 'McDonald\'s (via Rappi)',
      productName: query + ' - BigMac',
      price: 4990,
      deliveryFee: 990,
      discount: 500,
      estimatedTime: '25-35 min',
      rating: 4.3,
      deepLink: 'https://www.rappi.cl/restaurantes/mcdonalds?utm_source=mejordelivery',
      imageUrl: null,
    },
    {
      platform: 'rappi',
      restaurantName: 'Burger King (via Rappi)',
      productName: query + ' - Whopper',
      price: 4490,
      deliveryFee: 1490,
      discount: 0,
      estimatedTime: '30-40 min',
      rating: 4.1,
      deepLink: 'https://www.rappi.cl/restaurantes/burger-king?utm_source=mejordelivery',
      imageUrl: null,
    },
  ];
}

async function getPedidosYa(query, city) {
  await delay(MOCK_DELAY + 100);
  return [
    {
      platform: 'pedidosya',
      restaurantName: 'McDonald\'s (via PedidosYa)',
      productName: query + ' - BigMac',
      price: 4990,
      deliveryFee: 690,
      discount: 0,
      estimatedTime: '20-30 min',
      rating: 4.4,
      deepLink: 'https://www.pedidosya.cl/restaurantes/mcdonalds?utm_source=mejordelivery',
      imageUrl: null,
    },
    {
      platform: 'pedidosya',
      restaurantName: 'Pizza Hut (via PedidosYa)',
      productName: query + ' - Personal',
      price: 5990,
      deliveryFee: 0,
      discount: 1000,
      estimatedTime: '35-45 min',
      rating: 4.0,
      deepLink: 'https://www.pedidosya.cl/restaurantes/pizza-hut?utm_source=mejordelivery',
      imageUrl: null,
    },
  ];
}

async function getUberEats(query, city) {
  await delay(MOCK_DELAY + 200);
  return [
    {
      platform: 'ubereats',
      restaurantName: 'McDonald\'s (via Uber Eats)',
      productName: query + ' - BigMac',
      price: 4990,
      deliveryFee: 1190,
      discount: 0,
      estimatedTime: '20-25 min',
      rating: 4.2,
      deepLink: 'https://www.ubereats.com/cl/store/mcdonalds?utm_source=mejordelivery',
      imageUrl: null,
    },
  ];
}

module.exports = { getRappi, getPedidosYa, getUberEats };
