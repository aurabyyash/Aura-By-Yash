import { Link, useNavigate } from 'react-router-dom';
import { LogOut, Search, ShoppingCart, User } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Navbar = () => {
  const { cartCount } = useCart();
  const { isAuthenticated, isAdmin, logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <nav>
      <div className="nav-logo">
        <Link to="/">
          <img src="/aura.png" alt="Aura By Yash" />
        </Link>
      </div>
      <ul className="nav-links">
        <li><Link to="/category/necklaces">Necklaces</Link></li>
        <li><Link to="/category/rings">Rings</Link></li>
        <li><Link to="/category/bracelets">Bracelets</Link></li>
        <li><Link to="/category/earrings">Earrings</Link></li>
        {isAdmin && <li><Link to="/admin">Admin Panel</Link></li>}
      </ul>
      <div className="nav-icons">
        <button aria-label="Search"><Search size={18} /></button>
        {isAuthenticated ? (
          <>
            <span className="nav-user">{user.role}</span>
            <button aria-label="Logout" onClick={handleLogout}><LogOut size={18} /></button>
          </>
        ) : (
          <button aria-label="Login" onClick={() => navigate('/login')}><User size={18} /></button>
        )}
        <Link to="/cart" style={{ position: 'relative' }}>
          <ShoppingCart size={18} />
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </Link>
      </div>
    </nav>
  );
};

export default Navbar;
