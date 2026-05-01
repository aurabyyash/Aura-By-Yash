import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Category from './pages/Category';
import ProductDetail from './pages/ProductDetail';
import Cart from './pages/Cart';
import AllProducts from './pages/AllProducts';
import Admin from './pages/Admin';
import ConfirmedOrders from './pages/ConfirmedOrders';
import Login from './pages/Login';
import { CartProvider } from './context/CartContext';
import { ProductProvider } from './context/ProductContext';
import { AuthProvider } from './context/AuthContext';

const AppShell = () => {
  const location = useLocation();
  const isHome = location.pathname === '/';

  return (
    <div className={`app-container${isHome ? ' is-home' : ''}`}>
      <Navbar />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/all-products" element={<AllProducts />} />
        <Route path="/category/:categoryId" element={<Category />} />
        <Route path="/product/:productId" element={<ProductDetail />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/confirmed-orders" element={<ConfirmedOrders />} />
      </Routes>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <ProductProvider>
        <CartProvider>
          <Router>
            <AppShell />
          </Router>
        </CartProvider>
      </ProductProvider>
    </AuthProvider>
  );
}

export default App;
