import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import ProductArt from '../components/ProductArt';

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { products, loading } = useProducts();
  const [product, setProduct] = useState(null);
  const [selectedImage, setSelectedImage] = useState('');

  useEffect(() => {
    if (!loading) {
      const found = products.find(p => p.id === productId);
      setProduct(found);
      setSelectedImage(found?.imageUrls?.[0] || found?.imageUrl || '');
    }
    window.scrollTo(0, 0);
  }, [productId, products, loading]);

  const handleAddToCart = () => {
    if (product) addToCart(product);
  };

  const handleBuyNow = () => {
    if (product) {
      addToCart(product);
      navigate('/cart');
    }
  };

  if (!product) return <div style={{ padding: '80px 50px' }}>Loading...</div>;

  return (
    <div className="product-detail-container">
      <div className="product-detail-media">
        <div className="product-detail-image">
          <ProductArt product={selectedImage ? { ...product, imageUrls: [selectedImage] } : product} />
        </div>
        {product.imageUrls?.length > 1 && (
          <div className="product-gallery">
            {product.imageUrls.map(imageUrl => (
              <button
                key={imageUrl}
                className={selectedImage === imageUrl ? 'active' : ''}
                onClick={() => setSelectedImage(imageUrl)}
              >
                <img src={imageUrl} alt={product.name} />
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="product-detail-info">
        <p className="pd-category"><Link to={`/category/${product.categoryId}`} className="text-link" style={{border: 'none'}}>{product.categoryId}</Link></p>
        <h1 className="pd-title">{product.name}</h1>
        <p className="pd-price">₹{product.price}</p>
        
        <p className="pd-desc">
          {product.description || 'Bold. Raw. Unapologetically yours. Handcrafted to perfection, this piece is designed for the new generation of men who wear their energy.'}
        </p>

        <ul className="pd-specs">
          <li><span>Material</span><span>{product.material || 'Premium Alloy'}</span></li>
          <li><span>Anti-Tarnished</span><span>{product.antitarnish || 'Yes'}</span></li>
          <li><span>Rating</span><span>{product.rating}</span></li>
          <li><span>Availability</span><span>In Stock</span></li>
        </ul>

        <div className="pd-actions">
          <button className="btn-primary" onClick={handleAddToCart}>Add to Cart</button>
          <button className="btn-dark" onClick={handleBuyNow}>Buy Now</button>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;
