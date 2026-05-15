// scraper.js — obtiene ofertas de las diferentes plataformas
// Versión básica con datos de ejemplo

async function getRappi(query, city) {
  // En producción, aquí iría web scraping o API calls a Rappi
  // Por ahora retornamos datos de ejemplo
  return [
    {
      platform: 'rappi',
      restaurantName: 'Burguer Kings - ' + (city || 'Centro'),
      productName: query || 'Combo Hamburguesa',
      price: 12.99,
      deliveryFee: 2.50,
      discount: 0,
      estimatedTime: '25-30 min',
      rating: 4.5,
      deepLink: 'https://rappi.com',
      imageUrl: null,
    },
  ];
}

async function getPedidosYa(query, city) {
  // En producción, aquí iría web scraping o API calls a PedidosYa
  return [
    {
      platform: 'pedidosya',
      restaurantName: 'Pizza Express - ' + (city || 'Centro'),
      productName: query || 'Pizza Grande',
      price: 14.99,
      deliveryFee: 1.50,
      discount: 2.00,
      estimatedTime: '20-25 min',
      rating: 4.3,
      deepLink: 'https://pedidosya.com',
      imageUrl: null,
    },
  ];
}

async function getUberEats(query, city) {
  // En producción, aquí iría web scraping o API calls a Uber Eats
  return [
    {
      platform: 'ubereats',
      restaurantName: 'Tacos al Pastor - ' + (city || 'Centro'),
      productName: query || 'Tacos x3',
      price: 8.99,
      deliveryFee: 3.00,
      discount: 1.00,
      estimatedTime: '15-20 min',
      rating: 4.7,
      deepLink: 'https://ubereats.com',
      imageUrl: null,
    },
  ];
}

module.exports = {
  getRappi,
  getPedidosYa,
  getUberEats,
};
