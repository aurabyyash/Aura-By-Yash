import { restRequest } from '../lib/supabase';

export const fromProductRow = (row) => ({
  id: row.id,
  name: row.name,
  categoryId: row.category_id,
  price: Number(row.price || 0),
  rating: row.rating || 'New',
  isNew: Boolean(row.is_new),
  isHot: Boolean(row.is_hot),
  isLtd: Boolean(row.is_ltd),
  material: row.material || '',
  antitarnish: row.antitarnish || '',
  imageUrls: Array.isArray(row.image_urls) && row.image_urls.length > 0
    ? row.image_urls
    : row.image_url
      ? [row.image_url]
      : [],
  imageUrl: Array.isArray(row.image_urls) && row.image_urls.length > 0 ? row.image_urls[0] : row.image_url || '',
  description: row.description || '',
});

const toProductRow = (product) => ({
  id: product.id || String(Date.now()),
  name: product.name,
  category_id: product.categoryId,
  price: Number(product.price || 0),
  rating: product.rating || 'New',
  is_new: Boolean(product.isNew),
  is_hot: Boolean(product.isHot),
  is_ltd: Boolean(product.isLtd),
  material: product.material || '',
  antitarnish: product.antitarnish || '',
  image_url: product.imageUrls?.[0] || product.imageUrl || '',
  image_urls: product.imageUrls || (product.imageUrl ? [product.imageUrl] : []),
  description: product.description || '',
});

export const fetchProducts = async () => {
  const rows = await restRequest('/products?select=*&order=created_at.desc', {
    headers: { Prefer: '' },
  });

  return rows.map(fromProductRow);
};

export const createProduct = async (product) => {
  const rows = await restRequest('/products', {
    method: 'POST',
    body: toProductRow(product),
  });

  return fromProductRow(rows[0]);
};

export const updateProduct = async (id, product) => {
  const rows = await restRequest(`/products?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: toProductRow({ ...product, id }),
  });

  return fromProductRow(rows[0]);
};

export const deleteProduct = async (id) => restRequest(`/products?id=eq.${encodeURIComponent(id)}`, {
  method: 'DELETE',
});
