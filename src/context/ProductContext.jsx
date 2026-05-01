import { createContext, useContext, useEffect, useState } from 'react';
import { categories as fallbackCategories, products as fallbackProducts } from '../data/products';
import {
  createCategory,
  deleteCategory as deleteSupabaseCategory,
  fetchCategories as fetchSupabaseCategories,
  updateCategory as updateSupabaseCategory,
} from '../services/categories';
import {
  createProduct,
  deleteProduct as deleteSupabaseProduct,
  fetchProducts as fetchSupabaseProducts,
  updateProduct as updateSupabaseProduct,
} from '../services/products';

const ProductContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useProducts = () => useContext(ProductContext);

const withCategoryCounts = (categories, products) => categories.map(category => {
  const itemCount = products.filter(product => product.categoryId === category.id).length;

  return {
    ...category,
    itemCount,
    count: `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`,
  };
});

// eslint-disable-next-line react/prop-types
export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    setLoading(true);

    try {
      const supabaseProducts = await fetchSupabaseProducts();
      let supabaseCategories = [];

      try {
        supabaseCategories = await fetchSupabaseCategories();
      } catch (categoryError) {
        console.error('Error fetching categories:', categoryError);
      }

      setProducts(supabaseProducts);
      setCategories(withCategoryCounts(
        supabaseCategories.length > 0 ? supabaseCategories : fallbackCategories,
        supabaseProducts,
      ));
      setError('');
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts(fallbackProducts);
      setCategories(withCategoryCounts(fallbackCategories, fallbackProducts));
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const addProduct = async (product) => {
    await createProduct(product);
    await fetchProducts();
  };

  const updateProduct = async (id, updatedProduct) => {
    await updateSupabaseProduct(id, updatedProduct);
    await fetchProducts();
  };

  const deleteProduct = async (id) => {
    await deleteSupabaseProduct(id);
    await fetchProducts();
  };

  const addCategory = async (category) => {
    await createCategory(category);
    await fetchProducts();
  };

  const updateCategory = async (id, category) => {
    await updateSupabaseCategory(id, category);
    await fetchProducts();
  };

  const deleteCategory = async (id) => {
    await deleteSupabaseCategory(id);
    await fetchProducts();
  };

  return (
    <ProductContext.Provider value={{
      products,
      categories,
      loading,
      error,
      addProduct,
      updateProduct,
      deleteProduct,
      addCategory,
      updateCategory,
      deleteCategory,
      refreshProducts: fetchProducts,
    }}>
      {children}
    </ProductContext.Provider>
  );
};
