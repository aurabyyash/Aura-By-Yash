import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../utils/orders';
import ProductArt from '../components/ProductArt';

const Cart = () => {
  const { cart, removeFromCart, updateQuantity, clearCart, cartTotal } = useCart();
  const { isAuthenticated, isEmailConfirmed, resendConfirmation, user } = useAuth();
  const navigate = useNavigate();
  const [placedOrderId, setPlacedOrderId] = useState('');
  const [checkoutMessage, setCheckoutMessage] = useState('');
  const [checkoutError, setCheckoutError] = useState('');
  const [placingOrder, setPlacingOrder] = useState(false);

  const shipping = cartTotal > 999 ? 0 : 99;
  const orderTotal = cartTotal + shipping;

  const handleCheckout = async () => {
    setCheckoutError('');
    setCheckoutMessage('');

    if (!isEmailConfirmed) {
      setCheckoutError('Confirm your email first to unlock checkout.');
      return;
    }

    setPlacingOrder(true);

    try {
      const order = await createOrder({
        user,
        cart,
        subtotal: cartTotal,
        shipping,
        total: orderTotal,
      });

      clearCart();
      setPlacedOrderId(order.orderNumber);
    } catch (err) {
      setCheckoutError(err.message);
    } finally {
      setPlacingOrder(false);
    }
  };

  const handleResendConfirmation = async () => {
    setCheckoutError('');
    setCheckoutMessage('');

    try {
      await resendConfirmation();
      setCheckoutMessage('Confirmation mail sent again.');
    } catch (err) {
      setCheckoutError(err.message);
    }
  };

  return (
    <div className="cart-page">
      <h1 className="cart-header">Your Cart</h1>

      {cart.length === 0 ? (
        <div className="cart-empty">
          <p>{placedOrderId ? `Order ${placedOrderId} placed successfully.` : 'Your cart is currently empty.'}</p>
          <br />
          <Link to="/" className="btn-dark" style={{ textDecoration: 'none', display: 'inline-block' }}>Continue Shopping</Link>
        </div>
      ) : (
        <div className="cart-content">
          <div className="cart-items">
            {cart.map(item => (
              <div key={item.id} className="cart-item">
                <div className="cart-item-img">
                  <ProductArt product={item} />
                </div>
                <div className="cart-item-details">
                  <h3 className="cart-item-title">{item.name}</h3>
                  <p className="pd-category" style={{ marginBottom: 0 }}>{item.categoryId}</p>
                  <p className="cart-item-price">&#8377;{item.price}</p>
                  <div className="cart-item-controls">
                    <button onClick={() => updateQuantity(item.id, -1)}>-</button>
                    <span className="cart-item-qty">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.id, 1)}>+</button>
                  </div>
                </div>
                <button className="cart-item-remove" onClick={() => removeFromCart(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>

          <div className="cart-summary">
            <h3 className="cart-summary-title">Order Summary</h3>
            <div className="cart-summary-row">
              <span>Subtotal</span>
              <span>&#8377;{cartTotal}</span>
            </div>
            <div className="cart-summary-row">
              <span>Shipping</span>
              <span>{shipping === 0 ? 'Free' : <>&#8377;99</>}</span>
            </div>
            <div className="cart-summary-total">
              <span>Total</span>
              <span>&#8377;{orderTotal}</span>
            </div>

            {isAuthenticated ? (
              <>
                {!isEmailConfirmed && (
                  <button className="btn-primary" style={{ width: '100%', marginBottom: '12px' }} onClick={handleResendConfirmation}>
                    Resend Confirmation
                  </button>
                )}
                <button className="btn-dark" style={{ width: '100%' }} onClick={handleCheckout} disabled={placingOrder || !isEmailConfirmed}>
                  {placingOrder ? 'Placing Order...' : 'Checkout'}
                </button>
              </>
            ) : (
              <button className="btn-dark" style={{ width: '100%' }} onClick={() => navigate('/login')}>Sign In to Checkout</button>
            )}
            {checkoutMessage && <p className="cart-note">{checkoutMessage}</p>}
            {checkoutError && <p className="cart-error">{checkoutError}</p>}
          </div>
        </div>
      )}
    </div>
  );
};

export default Cart;
