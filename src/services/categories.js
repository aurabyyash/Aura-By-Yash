import { restRequest } from '../lib/supabase';

const slugify = (value = '') => value
  .trim()
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-+|-+$/g, '');

export const fromCategoryRow = (row) => ({
  id: row.id,
  name: row.name,
  imageUrl: row.image_url || '',
  sortOrder: Number(row.sort_order || 0),
});

const toCategoryRow = (category) => ({
  id: category.id || slugify(category.name),
  name: category.name,
  image_url: category.imageUrl || '',
  sort_order: Number(category.sortOrder || 0),
});

export const fetchCategories = async () => {
  const rows = await restRequest('/categories?select=*&order=sort_order.asc,name.asc', {
    headers: { Prefer: '' },
  });

  return rows.map(fromCategoryRow);
};

export const createCategory = async (category) => {
  const rows = await restRequest('/categories', {
    method: 'POST',
    body: toCategoryRow(category),
  });

  return fromCategoryRow(rows[0]);
};

export const updateCategory = async (id, category) => {
  const rows = await restRequest(`/categories?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    body: toCategoryRow({ ...category, id }),
  });

  return fromCategoryRow(rows[0]);
};

export const deleteCategory = async (id) => restRequest(`/categories?id=eq.${encodeURIComponent(id)}`, {
  method: 'DELETE',
});

export const createCategoryId = slugify;
