import { appendConfirmedOrdersToSheet, restRequest, sendOrderCompletionMail } from '../lib/supabase';

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
  completedAt: row.completed_at ? new Date(row.completed_at).toLocaleString() : '',
  completionEmailSent: Boolean(row.completion_email_sent),
  completionEmailError: row.completion_email_error || '',
  sheetSyncedAt: row.sheet_synced_at ? new Date(row.sheet_synced_at).toLocaleString() : '',
  sheetSyncError: row.sheet_sync_error || '',
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

export const completeOrder = async (order) => {
  const orderFilter = encodeURIComponent(order.orderNumber);
  const completedAt = new Date().toISOString();
  const [completedRow] = await restRequest(`/orders?order_number=eq.${orderFilter}`, {
    method: 'PATCH',
    body: {
      status: 'Completed',
      completed_at: completedAt,
      completion_email_sent: false,
      completion_email_error: null,
    },
  });

  const completedOrder = fromOrderRow(completedRow);
  let mailResult = { sent: false, message: 'Email provider is not configured.' };
  let sheetResult = { synced: false, message: 'Google Sheets sync is not configured.' };

  try {
    mailResult = await sendOrderCompletionMail(completedOrder);
  } catch (err) {
    mailResult = { sent: false, message: err.message };
  }

  try {
    sheetResult = await appendConfirmedOrdersToSheet([completedOrder]);
  } catch (err) {
    sheetResult = { synced: false, message: err.message };
  }

  const sheetSynced = isOrderSyncedToSheet(sheetResult, completedOrder.orderNumber);

  const [finalRow] = await restRequest(`/orders?order_number=eq.${orderFilter}`, {
    method: 'PATCH',
    body: {
      completion_email_sent: Boolean(mailResult.sent),
      completion_email_error: mailResult.sent ? null : mailResult.message,
      sheet_synced_at: sheetSynced ? new Date().toISOString() : null,
      sheet_sync_error: sheetSynced ? null : sheetResult.message,
    },
  });

  return {
    order: fromOrderRow(finalRow),
    mail: mailResult,
    sheet: sheetResult,
  };
};

const isOrderSyncedToSheet = (sheetResult, orderNumber) => {
  const syncedOrderNumbers = sheetResult?.syncedOrderNumbers || [];
  const skippedOrderNumbers = sheetResult?.skippedOrderNumbers || [];
  return Boolean(sheetResult?.synced && [...syncedOrderNumbers, ...skippedOrderNumbers].includes(orderNumber));
};

export const syncConfirmedOrdersToSheet = async (orders) => {
  const confirmedOrders = orders.filter(order => order.status.toLowerCase() === 'completed');

  if (confirmedOrders.length === 0) {
    return { orders: [], sheet: { synced: true, message: 'No confirmed orders to sync.' } };
  }

  let sheetResult;

  try {
    sheetResult = await appendConfirmedOrdersToSheet(confirmedOrders);
  } catch (err) {
    sheetResult = { synced: false, message: err.message, syncedOrderNumbers: [], skippedOrderNumbers: [] };
  }

  const updatedOrders = await Promise.all(confirmedOrders.map(async (order) => {
    const orderFilter = encodeURIComponent(order.orderNumber);
    const sheetSynced = isOrderSyncedToSheet(sheetResult, order.orderNumber);
    const body = sheetSynced
      ? { sheet_synced_at: new Date().toISOString(), sheet_sync_error: null }
      : { sheet_sync_error: sheetResult.message };
    const [row] = await restRequest(`/orders?order_number=eq.${orderFilter}`, {
      method: 'PATCH',
      body,
    });

    return fromOrderRow(row);
  }));

  return {
    orders: updatedOrders,
    sheet: sheetResult,
  };
};

export const listOrders = async () => {
  const rows = await restRequest('/orders?select=*&order=created_at.desc', {
    headers: { Prefer: '' },
  });

  return rows.map(fromOrderRow);
};
