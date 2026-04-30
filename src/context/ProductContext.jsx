import { createContext, useContext, useEffect, useState } from 'react';
import { products as fallbackProducts } from '../data/products';
import {
  createProduct,
  deleteProduct as deleteSupabaseProduct,
  fetchProducts as fetchSupabaseProducts,
  updateProduct as updateSupabaseProduct,
} from '../services/products';

const ProductContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useProducts = () => useContext(ProductContext);

// eslint-disable-next-line react/prop-types
export const ProductProvider = ({ children }) => {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchProducts = async () => {
    setLoading(true);

    try {
      const supabaseProducts = await fetchSupabaseProducts();
      setProducts(supabaseProducts);
      setError('');
    } catch (err) {
      console.error('Error fetching products:', err);
      setProducts(fallbackProducts);
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
    fetchProducts();
  };

  const updateProduct = async (id, updatedProduct) => {
    await updateSupabaseProduct(id, updatedProduct);
    fetchProducts();
  };

  const deleteProduct = async (id) => {
    await deleteSupabaseProduct(id);
    fetchProducts();
  };

  return (
    <ProductContext.Provider value={{ products, loading, error, addProduct, updateProduct, deleteProduct, refreshProducts: fetchProducts }}>
      {children}
    </ProductContext.Provider>
  );
};
