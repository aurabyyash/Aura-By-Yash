import { restRequest } from '../lib/supabase';

const createOrderNumber = () => {
  const date = new Date().toISOString().slice(0, 10).replaceAll('-', '');
  const suffix = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `AURA-${date}-${suffix}`;
};

export const fromOrderRow = (row) => ({
  id: row.order_number,
  orderNumber: row.order_number,
  customerName: row.customer_name,
  customerEmail: row.customer_email,
  customerPhone: row.customer_phone,
  date: new Date(row.created_at).toLocaleString(),
  items: row.items || [],
  subtotal: Number(row.subtotal || 0),
  shipping: Number(row.shipping || 0),
  total: Number(row.total || 0),
  status: row.status || 'Placed',
  paymentProvider: row.payment_provider || '',
  paymentStatus: row.payment_status || '',
  razorpayOrderId: row.razorpay_order_id || '',
  razorpayPaymentId: row.razorpay_payment_id || '',
  razorpaySignature: row.razorpay_signature || '',
});

export const createOrder = async ({ user, cart, subtotal, shipping, total, payment = {} }) => {
  const rows = await restRequest('/orders', {
    method: 'POST',
    body: {
      order_number: createOrderNumber(),
      user_id: user.id,
      customer_email: user.email,
      customer_name: user.username || user.name || user.email,
      customer_phone: user.phone || '',
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        categoryId: item.categoryId,
        price: Number(item.price || 0),
        quantity: item.quantity,
        imageUrl: item.imageUrl || '',
        imageUrls: item.imageUrls || (item.imageUrl ? [item.imageUrl] : []),
      })),
      subtotal,
      shipping,
      total,
      status: 'Placed',
      payment_provider: payment.provider || 'razorpay',
      payment_status: payment.status || 'paid',
      razorpay_order_id: payment.razorpayOrderId || payment.razorpay_order_id || null,
      razorpay_payment_id: payment.razorpayPaymentId || payment.razorpay_payment_id || null,
      razorpay_signature: payment.razorpaySignature || payment.razorpay_signature || null,
    },
  });

  return fromOrderRow(rows[0]);
};

export const listOrders = async () => {
  const rows = await restRequest('/orders?select=*&order=created_at.desc', {
    headers: { Prefer: '' },
  });

  return rows.map(fromOrderRow);
};
