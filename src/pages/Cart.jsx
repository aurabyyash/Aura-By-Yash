import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { createOrder } from '../utils/orders';
import { createRazorpayOrder, verifyRazorpayPayment } from '../lib/supabase';
import ProductArt from '../components/ProductArt';

const loadRazorpayCheckout = () => new Promise((resolve, reject) => {
  if (window.Razorpay) {
    resolve(true);
    return;
  }

  const existingScript = document.querySelector('script[src="https://checkout.razorpay.com/v1/checkout.js"]');
  if (existingScript) {
    existingScript.addEventListener('load', () => resolve(true), { once: true });
    existingScript.addEventListener('error', () => reject(new Error('Could not load Razorpay checkout.')), { once: true });
    return;
  }

  const script = document.createElement('script');
  script.src = 'https://checkout.razorpay.com/v1/checkout.js';
  script.async = true;
  script.onload = () => resolve(true);
  script.onerror = () => reject(new Error('Could not load Razorpay checkout.'));
  document.body.appendChild(script);
});

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
      const checkoutCart = cart.map(item => ({ ...item }));
      const checkoutSubtotal = cartTotal;
      const checkoutShipping = shipping;
      const checkoutTotal = orderTotal;

      await loadRazorpayCheckout();

      const razorpayOrder = await createRazorpayOrder({
        amount: checkoutTotal,
        currency: 'INR',
      });

      const options = {
        key: razorpayOrder.keyId,
        amount: razorpayOrder.amount,
        currency: razorpayOrder.currency || 'INR',
        name: 'Aura By Yash',
        description: 'Aura order payment',
        order_id: razorpayOrder.id,
        prefill: {
          name: user.username || user.name || '',
          email: user.email || '',
          contact: user.phone || '',
        },
        notes: {
          customer_id: user.id,
        },
        theme: {
          color: '#111111',
        },
        handler: async (paymentResponse) => {
          try {
            const verification = await verifyRazorpayPayment(paymentResponse);

            if (!verification.valid) {
              throw new Error('Payment verification failed. Please contact support.');
            }

            const order = await createOrder({
              user,
              cart: checkoutCart,
              subtotal: checkoutSubtotal,
              shipping: checkoutShipping,
              total: checkoutTotal,
              payment: {
                provider: 'razorpay',
                status: 'paid',
                razorpayOrderId: paymentResponse.razorpay_order_id,
                razorpayPaymentId: paymentResponse.razorpay_payment_id,
                razorpaySignature: paymentResponse.razorpay_signature,
              },
            });

            clearCart();
            setPlacedOrderId(order.orderNumber);
            setCheckoutMessage(`Payment successful. Order ${order.orderNumber} placed.`);
          } catch (err) {
            setCheckoutError(err.message);
          } finally {
            setPlacingOrder(false);
          }
        },
        modal: {
          ondismiss: () => {
            setCheckoutError('Payment cancelled. Your order was not placed.');
            setPlacingOrder(false);
          },
        },
      };

      const checkout = new window.Razorpay(options);
      checkout.on('payment.failed', (response) => {
        setCheckoutError(response.error?.description || 'Payment failed. Please try again.');
        setPlacingOrder(false);
      });
      checkout.open();
    } catch (err) {
      setCheckoutError(err.message);
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
                  {placingOrder ? 'Opening Payment...' : 'Checkout'}
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
