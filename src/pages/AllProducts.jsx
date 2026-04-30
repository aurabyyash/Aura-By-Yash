import { useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import ProductArt from '../components/ProductArt';

const AllProducts = () => {
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { products, loading } = useProducts();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  if (loading) return <div style={{ padding: '80px 50px' }}>Loading...</div>;

  return (
    <div style={{ padding: '40px 50px' }}>
      <p className="section-eyebrow"><Link to="/" className="text-link">Home</Link> / All Products</p>
      <h2 className="section-title">Shop <em>Everything</em></h2>
      
      <div className="prod-grid">
        {products.map(product => (
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
    </div>
  );
};

export default AllProducts;
