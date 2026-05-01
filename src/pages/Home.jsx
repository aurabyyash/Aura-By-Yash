import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bookmark, MapPin, Menu, Search, ShoppingCart, User, X } from 'lucide-react';
import { categories } from '../data/products';
import { useProducts } from '../context/ProductContext';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import ProductArt from '../components/ProductArt';
import { getFrontMedia } from '../lib/supabase';

const videoMediaPattern = /\.(mp4|webm|ogg|ogv|mov|m4v)(\?|#|$)/i;
const isVideoMedia = (url = '') => videoMediaPattern.test(url);

const Home = () => {
  const navigate = useNavigate();
  const { addToCart, cartCount } = useCart();
  const { isAdmin, isAuthenticated } = useAuth();
  const { products } = useProducts();
  const observerRef = useRef(null);
  const [frontMedia, setFrontMedia] = useState([]);
  const [frontMediaIndex, setFrontMediaIndex] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  const latestDrops = products.filter(p => p.isNew || p.isHot || p.isLtd).slice(0, 6);
  const activeFrontMediaIndex = frontMedia.length > 0 ? frontMediaIndex % frontMedia.length : 0;
  const activeFrontMedia = frontMedia[activeFrontMediaIndex];
  const activeFrontMediaIsVideo = isVideoMedia(activeFrontMedia);

  useEffect(() => {
    observerRef.current = new IntersectionObserver((entries) => {
      entries.forEach(e => {
        if (e.isIntersecting) e.target.classList.add('visible');
      });
    }, { threshold: 0.08 });

    document.querySelectorAll('.reveal').forEach(r => observerRef.current.observe(r));

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, []);

  useEffect(() => {
    getFrontMedia()
      .then(setFrontMedia)
      .catch((err) => console.error('Error loading front media:', err));
  }, []);

  useEffect(() => {
    if (frontMedia.length < 2) return undefined;

    const rotation = window.setInterval(() => {
      setFrontMediaIndex(currentIndex => (currentIndex + 1) % frontMedia.length);
    }, 5500);

    return () => window.clearInterval(rotation);
  }, [frontMedia.length]);

  const goTo = (path) => {
    setMenuOpen(false);
    navigate(path);
  };

  const scrollToCategories = () => {
    setMenuOpen(false);
    document.getElementById('categories')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <>
      <section className={`hero front-hero${activeFrontMedia ? ' has-front-media' : ''}${activeFrontMediaIsVideo ? ' has-front-video' : ''}${activeFrontMedia && !activeFrontMediaIsVideo ? ' has-front-image' : ''}`}>
        {frontMedia.length > 0 && (
          <div className="front-hero-slides" aria-hidden="true">
            {frontMedia.map((mediaUrl, index) => {
              const mediaIsVideo = isVideoMedia(mediaUrl);
              const isActive = index === activeFrontMediaIndex;

              return (
                <div
                  className={`front-hero-slide${isActive ? ' active' : ''}${mediaIsVideo ? ' is-video' : ' is-image'}`}
                  key={mediaUrl}
                >
                  {mediaIsVideo ? (
                    <video
                      className="front-hero-media"
                      src={mediaUrl}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="metadata"
                    />
                  ) : (
                    <img
                      className="front-hero-media"
                      src={mediaUrl}
                      alt=""
                      loading={isActive ? 'eager' : 'lazy'}
                      decoding="async"
                      fetchPriority={isActive ? 'high' : 'auto'}
                    />
                  )}
                </div>
              );
            })}
          </div>
        )}

        <div className="front-hero-nav">
          <div className="front-hero-links" aria-label="Featured navigation">
            <button type="button" onClick={() => goTo('/all-products')}>New in</button>
            <button type="button" onClick={scrollToCategories}>Collections</button>
          </div>

          <Link className="front-hero-logo" to="/" aria-label="Aura By Yash home">
            <img src="/aura.png" alt="Aura By Yash" />
          </Link>

          <div className="front-hero-icons">
            <button type="button" aria-label="Collections"><Bookmark size={22} /></button>
            <button type="button" aria-label="Store location"><MapPin size={22} /></button>
            <button type="button" aria-label="Search"><Search size={22} /></button>
            <button type="button" aria-label="Login" onClick={() => navigate('/login')}><User size={22} /></button>
            <Link className="front-cart-link" to="/cart" aria-label="Cart">
              <ShoppingCart size={22} />
              {cartCount > 0 && <span className="front-cart-count">{cartCount}</span>}
            </Link>
            <button
              type="button"
              className="front-menu-btn"
              aria-label={menuOpen ? 'Close menu' : 'Menu'}
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen(current => !current)}
            >
              {menuOpen ? <X size={24} /> : <Menu size={26} />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <>
            <button className="front-menu-backdrop" type="button" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
            <nav className="front-menu-panel" aria-label="Homepage menu">
              <button type="button" onClick={() => goTo('/all-products')}>Shop All</button>
              <button type="button" onClick={scrollToCategories}>Collections</button>
              <button type="button" onClick={() => goTo('/category/necklaces')}>Necklaces</button>
              <button type="button" onClick={() => goTo('/category/rings')}>Rings</button>
              <button type="button" onClick={() => goTo('/category/bracelets')}>Bracelets</button>
              <button type="button" onClick={() => goTo('/category/earrings')}>Earrings</button>
              <button type="button" onClick={() => goTo('/cart')}>Cart ({cartCount})</button>
              {isAdmin && <button type="button" onClick={() => goTo('/admin')}>Admin Panel</button>}
              {!isAuthenticated && <button type="button" onClick={() => goTo('/login')}>Login</button>}
            </nav>
          </>
        )}

        <div className="front-hero-fallback" aria-hidden="true">
          <span>Aura</span>
        </div>

        <button className="front-hero-shop" type="button" onClick={() => navigate('/all-products')}>
          Shop now
        </button>

        {frontMedia.length > 1 && (
          <div className="front-hero-dots" aria-label="Front media slides">
            {frontMedia.map((mediaUrl, index) => (
              <button
                key={mediaUrl}
                type="button"
                className={index === activeFrontMediaIndex ? 'active' : ''}
                aria-label={`Show front media ${index + 1}`}
                onClick={() => setFrontMediaIndex(index)}
              />
            ))}
          </div>
        )}
      </section>

      <div className="marquee-wrap">
        <div className="marquee-track">
          {[...Array(10)].map((_, i) => (
            <React.Fragment key={i}>
              <div className="marquee-item"><span>{i % 2 === 0 ? 'Free Shipping Above Rs.999' : 'Premium Gen Z Jewelry'}</span><span className="marquee-dot"></span></div>
              <div className="marquee-item"><span>Aura By Yash</span><span className="marquee-dot"></span></div>
            </React.Fragment>
          ))}
        </div>
      </div>

      <section className="section products reveal">
        <p className="section-eyebrow">Latest Drops</p>
        <h2 className="section-title">New <em>Arrivals</em></h2>
        <div className="prod-grid">
          {latestDrops.map(product => (
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
                  <span className="prod-price">Rs. {product.price}</span>
                  <span className="prod-rating">{product.rating}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section id="categories" className="section reveal">
        <p className="section-eyebrow">Browse By Category</p>
        <h2 className="section-title">Shop the <em>Collection</em></h2>
        <div className="cat-grid">
          {categories.map((cat) => (
            <div key={cat.id} className="cat-card" onClick={() => navigate(`/category/${cat.id}`)}>
              <div className="cat-icon-wrap">
                <svg width="70" height="70" viewBox="0 0 70 70" fill="none">
                  <circle cx="35" cy="35" r="24" strokeWidth="1.5" />
                </svg>
              </div>
              <div className="cat-inner">
                <p className="cat-name">{cat.name}</p>
                <p className="cat-count">{cat.count}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      <div className="feature-strip reveal">
        <div className="feat-item"><svg className="feat-icon" viewBox="0 0 36 36" fill="none"><path d="M18 3L33 10V26L18 33L3 26V10Z" strokeWidth="1.5" fill="none" /></svg><p className="feat-title">Premium Quality</p><p className="feat-desc">High-grade metals & stones</p></div>
        <div className="feat-item"><svg className="feat-icon" viewBox="0 0 36 36" fill="none"><rect x="7" y="9" width="22" height="18" rx="2" strokeWidth="1.5" fill="none" /><path d="M13 18 L16 21 L23 14" strokeWidth="1.5" strokeLinecap="round" /></svg><p className="feat-title">Easy Returns</p><p className="feat-desc">7-day hassle-free returns</p></div>
        <div className="feat-item"><svg className="feat-icon" viewBox="0 0 36 36" fill="none"><path d="M7 18L18 7L29 18" strokeWidth="1.5" strokeLinecap="round" /><path d="M11 14V29H25V14" strokeWidth="1.5" fill="none" /><rect x="15" y="22" width="6" height="7" strokeWidth="1" fill="none" /></svg><p className="feat-title">Free Shipping</p><p className="feat-desc">On orders above Rs.999</p></div>
        <div className="feat-item"><svg className="feat-icon" viewBox="0 0 36 36" fill="none"><circle cx="18" cy="16" r="7" strokeWidth="1.5" fill="none" /><path d="M12 27 Q18 23 24 27" strokeWidth="1.5" strokeLinecap="round" fill="none" /><path d="M26 12 L28 14 L32 10" strokeWidth="1" strokeLinecap="round" /></svg><p className="feat-title">Verified Brand</p><p className="feat-desc">100% authentic & hallmarked</p></div>
      </div>

      <section className="editorial reveal">
        <div className="editorial-img">
          <svg width="180" height="240" viewBox="0 0 180 240" fill="none">
            <circle cx="90" cy="110" r="68" strokeWidth="1" />
            <circle cx="90" cy="110" r="50" strokeWidth="1.5" />
            <polygon points="90,80 100,97 118,97 104,108 109,126 90,115 71,126 76,108 62,97 80,97" fill="none" strokeWidth="1.5" />
          </svg>
        </div>
        <div>
          <p className="section-eyebrow">Our Story</p>
          <h2 className="editorial-quote">Jewelry that <em>defines</em> your generation.</h2>
          <p className="editorial-body">Aura by Yash was born from a simple idea: men deserve jewelry that speaks as loud as their personality. We design for the bold, the expressive, and the unapologetically themselves.</p>
          <a href="#" className="text-link">Read Our Story</a>
        </div>
      </section>

      <section className="newsletter reveal">
        <p className="section-eyebrow">Stay in the Loop</p>
        <h2 className="newsletter-title">Join the <em>Aura</em> Club</h2>
        <p className="newsletter-sub">Get early access to new drops, exclusive offers & style edits</p>
        <div className="newsletter-form">
          <input type="email" className="newsletter-input" placeholder="Enter your email" />
          <button className="newsletter-btn">Subscribe</button>
        </div>
      </section>

      <footer>
        <div className="footer-grid">
          <div>
            <img src="/aurabyyash.png" alt="Aura By Yash" style={{ height: '40px', marginBottom: '12px' }} />
            <p className="footer-tagline">Jewelry crafted for the new generation of men. Wear your energy.</p>
          </div>
          <div><p className="footer-col-title">Shop</p><ul className="footer-links"><li><Link to="/category/necklaces">Necklaces</Link></li><li><Link to="/category/rings">Rings</Link></li><li><Link to="/category/bracelets">Bracelets</Link></li><li><Link to="/category/earrings">Earrings</Link></li></ul></div>
          <div><p className="footer-col-title">Help</p><ul className="footer-links"><li><a href="#">Shipping Info</a></li><li><a href="#">Returns</a></li><li><a href="#">Track Order</a></li><li><a href="#">FAQ</a></li></ul></div>
          <div><p className="footer-col-title">Follow</p><ul className="footer-links"><li><a href="#">Instagram</a></li><li><a href="#">Pinterest</a></li><li><a href="#">YouTube</a></li><li><a href="#">WhatsApp</a></li></ul></div>
        </div>
        <div className="footer-bottom">
          <p className="footer-copy">(c) 2025 Aura By Yash. All rights reserved.</p>
          <div className="footer-socials"><a href="#">Privacy</a><a href="#">Terms</a><a href="#">Contact</a></div>
        </div>
      </footer>
    </>
  );
};

export default Home;
