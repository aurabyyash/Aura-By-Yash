import { useEffect, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ExternalLink, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { listOrders, syncConfirmedOrdersToSheet } from '../utils/orders';

const SHEET_URL = 'https://docs.google.com/spreadsheets/d/1CgZUdrsmz9VzpbGB9EsN6_rj1CwYkBImFKM4b72Edmo/edit?usp=sharing';

const formatCurrency = (value) => `Rs. ${Number(value || 0).toLocaleString('en-IN')}`;

const ConfirmedOrders = () => {
  const { isAdmin, loading: authLoading } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrders = async () => {
      if (!isAdmin) {
        setLoading(false);
        return;
      }

      try {
        const nextOrders = await listOrders();
        setOrders(nextOrders.filter(order => order.status.toLowerCase() === 'completed'));
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [isAdmin]);

  if (authLoading || loading) return <div className="page-loading">Loading...</div>;

  if (!isAdmin) {
    return <Navigate to="/login" replace />;
  }

  const handleSyncSheet = async () => {
    setSyncing(true);
    setMessage('');
    setError('');

    try {
      const result = await syncConfirmedOrdersToSheet(orders);
      const nextOrders = orders.map(order => (
        result.orders.find(updatedOrder => updatedOrder.orderNumber === order.orderNumber) || order
      ));
      setOrders(nextOrders);

      if (result.sheet.synced) {
        const syncedCount = result.sheet.syncedOrderNumbers?.length || 0;
        const skippedCount = result.sheet.skippedOrderNumbers?.length || 0;
        setMessage(`Google Sheet sync complete. ${syncedCount} added, ${skippedCount} already existed.`);
      } else {
        setError(`Google Sheet sync skipped: ${result.sheet.message}`);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  return (
    <main className="confirmed-page">
      <div className="confirmed-toolbar">
        <div>
          <p className="section-eyebrow">Order Complete</p>
          <h1 className="section-title">Confirmed <em>Orders</em></h1>
        </div>
        <div className="confirmed-toolbar-actions">
          <Link className="admin-link-button" to="/admin">Back to Admin</Link>
          <a className="admin-link-button" href={SHEET_URL} target="_blank" rel="noreferrer">
            <ExternalLink size={15} />
            Open Sheet
          </a>
          <button className="admin-complete-btn" type="button" onClick={handleSyncSheet} disabled={syncing || orders.length === 0}>
            <RefreshCw size={15} />
            {syncing ? 'Syncing' : 'Sync to Sheet'}
          </button>
        </div>
      </div>

      {message && <p className="admin-success">{message}</p>}
      {error && <p className="admin-alert">{error}</p>}

      {orders.length === 0 ? (
        <div className="admin-empty">No confirmed orders yet.</div>
      ) : (
        <div className="confirmed-order-grid">
          {orders.map(order => (
            <article className="confirmed-order-card" key={order.orderNumber}>
              <div className="confirmed-order-top">
                <div>
                  <p className="admin-order-id">{order.orderNumber}</p>
                  <p className="admin-order-meta">{order.customerName} / {order.customerEmail}</p>
                  {order.customerPhone && <p className="admin-order-meta">Phone: {order.customerPhone}</p>}
                  <p className="admin-order-meta">Placed: {order.date}</p>
                  <p className="admin-order-meta">Completed: {order.completedAt || 'Completed'}</p>
                </div>
                <span className="admin-order-status">{order.status}</span>
              </div>

              <div className="confirmed-summary">
                <span>Payment: {order.paymentStatus || 'Not recorded'}</span>
                {order.razorpayPaymentId && <span>Razorpay: {order.razorpayPaymentId}</span>}
                <span>Email: {order.completionEmailSent ? 'Sent' : order.completionEmailError || 'Pending setup'}</span>
                <span>Sheet: {order.sheetSyncedAt ? `Synced ${order.sheetSyncedAt}` : order.sheetSyncError || 'Not synced'}</span>
              </div>

              <div className="admin-order-items">
                {order.items.map((item, index) => (
                  <div className="admin-order-item" key={`${order.orderNumber}-${item.id}-${index}`}>
                    <span>{item.name}</span>
                    <span>x{item.quantity}</span>
                    <span>{formatCurrency(Number(item.price || 0) * Number(item.quantity || 0))}</span>
                  </div>
                ))}
              </div>

              <div className="admin-order-total">
                <span>Total</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
};

export default ConfirmedOrders;
