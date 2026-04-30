import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { categories } from '../data/products';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import ProductArt from '../components/ProductArt';

const Category = () => {
  const { categoryId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { products, loading } = useProducts();
  const [categoryProducts, setCategoryProducts] = useState([]);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    if (!loading) {
      const filtered = products.filter(p => p.categoryId === categoryId);
      setCategoryProducts(filtered);
      
      const cat = categories.find(c => c.id === categoryId);
      setCategoryName(cat ? cat.name : 'Category');
    }
    
    window.scrollTo(0, 0);
  }, [categoryId, products, loading]);

  if (loading) return <div style={{ padding: '80px 50px' }}>Loading...</div>;

  return (
    <div style={{ padding: '40px 50px' }}>
      <p className="section-eyebrow"><Link to="/" className="text-link">Home</Link> / {categoryName}</p>
      <h2 className="section-title">Shop <em>{categoryName}</em></h2>
      
      {categoryProducts.length === 0 ? (
        <p>No products found in this category.</p>
      ) : (
        <div className="prod-grid">
          {categoryProducts.map(product => (
            <div key={product.id} className="prod-card" onClick={() => navigate(`/product/${product.id}`)}>
              <div className="prod-img">
                {product.isNew && <span className="prod-badge-new">New</span>}
                {product.isHot && <span className="prod-badge-new">Hot</span>}
                {product.isLtd && <span className="prod-badge-new">Ltd</span>}
                <ProductArt product={product} />
                <div className="prod-actions" onClick={(e) => {
                  e.stopPropagation();
                  addToCart(product);
                }}>Add to Cart</div>
              </div>
              <div className="prod-info">
                <p className="prod-name">{product.name}</p>
                <div className="prod-meta">
                  <span className="prod-price">₹{product.price}</span>
                  <span className="prod-rating">{product.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Category;
