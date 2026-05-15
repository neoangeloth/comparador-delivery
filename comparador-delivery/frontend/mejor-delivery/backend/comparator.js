// comparator.js — recibe resultados crudos de los scrapers
// y los normaliza + rankea por precio final real

function rank(items) {
  return items
    .map(normalize)
    .filter(item => item.finalPrice > 0)
    .sort((a, b) => a.finalPrice - b.finalPrice);
}

function normalize(item) {
  const price = parseFloat(item.price) || 0;
  const delivery = parseFloat(item.deliveryFee) || 0;
  const discount = parseFloat(item.discount) || 0;

  return {
    platform: item.platform,           // 'rappi' | 'pedidosya' | 'ubereats'
    restaurantName: item.restaurantName || 'Sin nombre',
    productName: item.productName || 'Producto',
    price: price,
    deliveryFee: delivery,
    discount: discount,
    finalPrice: price + delivery - discount,
    estimatedTime: item.estimatedTime || '?',
    rating: item.rating || null,
    deepLink: item.deepLink || '#',
    imageUrl: item.imageUrl || null,
  };
}

module.exports = { rank, normalize };