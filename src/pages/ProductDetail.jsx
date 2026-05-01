import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import ProductArt from '../components/ProductArt';

const ProductDetail = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const { products, categories, loading } = useProducts();
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

  if (!product) return <div className="page-loading">Loading...</div>;

  const productImages = product.imageUrls?.length
    ? product.imageUrls
    : (product.imageUrl ? [product.imageUrl] : []);
  const visibleImages = productImages.length ? productImages : [''];
  const formatPrice = (value) => Number(value || 0).toLocaleString('en-IN');
  const category = categories.find(currentCategory => currentCategory.id === product.categoryId);

  return (
    <div className="product-detail-container">
      <div className="product-detail-media">
        <div className={`product-detail-media-grid ${visibleImages.length === 1 ? 'single' : ''}`}>
          {visibleImages.map((imageUrl, index) => (
            <button
              type="button"
              key={imageUrl || `${product.id}-fallback`}
              className={`product-detail-tile ${selectedImage === imageUrl || (!selectedImage && index === 0) ? 'active' : ''}`}
              onClick={() => setSelectedImage(imageUrl)}
            >
              <ProductArt product={imageUrl ? { ...product, imageUrls: [imageUrl], imageUrl } : product} />
            </button>
          ))}
        </div>

        {productImages.length > 1 && (
          <div className="product-gallery">
            {productImages.map(imageUrl => (
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
        <p className="pd-category">
          <Link to={`/category/${product.categoryId}`} className="text-link" style={{ border: 'none' }}>
            {category?.name || product.categoryId}
          </Link>
        </p>
        <h1 className="pd-title">{product.name}</h1>
        <p className="pd-price">Rs. {formatPrice(product.price)}</p>

        <div className="pd-actions">
          <button className="btn-primary" onClick={handleAddToCart}>Add to Cart</button>
          <button className="btn-dark" onClick={handleBuyNow}>Buy It Now</button>
        </div>

        <section className="pd-detail-panel">
          <div className="pd-detail-panel-heading">
            <span>Description / Material</span>
            <span>-</span>
          </div>
          <div className="pd-desc">
            <p>{product.description || 'Bold. Raw. Unapologetically yours. Handcrafted to perfection, this piece is designed for the new generation of men who wear their energy.'}</p>
            <p>Material: {product.material || 'Premium Alloy'}</p>
            <p>Anti-tarnish: {product.antitarnish || 'Yes'}</p>
            <p>Rating: {product.rating || 'New'}</p>
          </div>
        </section>

        <div className="pd-info-rows">
          <div><span>Shipping</span><span>+</span></div>
          <div><span>Returns / Exchange</span><span>+</span></div>
          <div><span>Warranty</span><span>+</span></div>
        </div>

        <section className="pd-material-promise">
          <h3>Our material ensure to last forever</h3>
          <div className="pd-promise-item">
            <strong>Aura Warranty</strong>
            <span>Premium materials, built to last. 1-year warranty on all products.</span>
          </div>
          <div className="pd-promise-item">
            <strong>Water, Heat & Sweat-Proof</strong>
            <span>Ready for daily wear, workouts, and changing weather.</span>
          </div>
          <div className="pd-promise-item">
            <strong>Hypoallergenic</strong>
            <span>Made to suit sensitive skin and resist tarnish.</span>
          </div>
        </section>
      </div>
    </div>
  );
};

export default ProductDetail;
