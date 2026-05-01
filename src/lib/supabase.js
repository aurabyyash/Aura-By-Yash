export const ADMIN_EMAIL = 'yashsain684@gmail.com';
export const ADMIN_PASSWORD = 'Yashsain684@gmail.com';

const DEFAULT_SUPABASE_URL = 'https://vfowybrltwgeajtbwqvf.supabase.co';
const DEFAULT_SUPABASE_PUBLISHABLE_KEY = 'sb_publishable_qrXSKHg3imF31IYUKkPXUg_ZZDnv3o5';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
  || import.meta.env.NEXT_PUBLIC_SUPABASE_URL
  || DEFAULT_SUPABASE_URL;
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
  || import.meta.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || DEFAULT_SUPABASE_PUBLISHABLE_KEY;
const SESSION_KEY = 'aura-supabase-session';
const STORAGE_BUCKET = 'product-images';
const FRONT_IMAGE_KEY = 'front-image';

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

const normalizeEmail = (email = '') => email.trim().toLowerCase();

export const isAdminEmail = (email = '') => normalizeEmail(email) === ADMIN_EMAIL;

export const getStoredSession = () => {
  const savedSession = localStorage.getItem(SESSION_KEY);
  return savedSession ? JSON.parse(savedSession) : null;
};

export const storeSession = (session) => {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
};

export const clearStoredSession = () => {
  localStorage.removeItem(SESSION_KEY);
};

export const readSessionFromUrl = () => {
  const params = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');

  if (!accessToken || !refreshToken) {
    return null;
  }

  const session = {
    access_token: accessToken,
    refresh_token: refreshToken,
    expires_in: Number(params.get('expires_in') || 3600),
    token_type: params.get('token_type') || 'bearer',
  };

  window.history.replaceState({}, document.title, window.location.pathname + window.location.search);
  return session;
};

const friendlySupabaseError = (message) => {
  if (message.includes("Could not find the table 'public.products'")) {
    return 'Supabase setup is incomplete: run the schema migration so the products table exists.';
  }

  if (message.includes("Could not find the table 'public.orders'")) {
    return 'Supabase setup is incomplete: run the schema migration so the orders table exists.';
  }

  if (message.includes("Could not find the table 'public.profiles'")) {
    return 'Supabase setup is incomplete: run the schema migration so the profiles table exists.';
  }

  if (message.includes("Could not find the table 'public.site_assets'")) {
    return 'Supabase setup is incomplete: run the latest schema migration so homepage front media can be saved.';
  }

  if (message.includes("'image_urls'") && message.includes('schema cache')) {
    return 'Supabase setup is incomplete: run the latest schema migration so products can store multiple catalog images.';
  }

  return message;
};

const parseResponse = async (response) => {
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.error_description || data?.message || data?.msg || 'Supabase request failed';
    throw new Error(friendlySupabaseError(message));
  }

  return data;
};

const requireConfig = () => {
  if (!isSupabaseConfigured) {
    throw new Error('Missing Supabase URL or publishable key.');
  }
};

const request = async (path, options = {}, session = null) => {
  requireConfig();

  const headers = {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${session?.access_token || SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    ...options.headers,
  };

  const response = await fetch(`${SUPABASE_URL}${path}`, {
    method: options.method || 'GET',
    headers,
    cache: options.cache,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  return parseResponse(response);
};

export const signUpCustomer = async ({ email, password, phone, username }) => {
  const normalizedEmail = normalizeEmail(email);

  if (isAdminEmail(normalizedEmail)) {
    throw new Error('This email is reserved for admin login.');
  }

  return request('/auth/v1/signup', {
    method: 'POST',
    body: {
      email: normalizedEmail,
      password,
      data: {
        phone,
        username,
        role: 'customer',
      },
    },
  });
};

const signUpAdmin = async () => request('/auth/v1/signup', {
  method: 'POST',
  body: {
    email: ADMIN_EMAIL,
    password: ADMIN_PASSWORD,
    data: {
      phone: '',
      username: 'Aura Admin',
      role: 'admin',
    },
  },
});

export const signInWithPassword = async ({ email, password }) => {
  const normalizedEmail = normalizeEmail(email);

  if (isAdminEmail(normalizedEmail) && password !== ADMIN_PASSWORD) {
    throw new Error('Invalid admin credentials.');
  }

  let session;

  try {
    session = await request('/auth/v1/token?grant_type=password', {
      method: 'POST',
      body: {
        email: normalizedEmail,
        password,
      },
    });
  } catch (err) {
    if (isAdminEmail(normalizedEmail) && err.message === 'Invalid login credentials') {
      try {
        const signupResult = await signUpAdmin();

        if (signupResult.session) {
          storeSession(signupResult.session);
          return signupResult.session;
        }

        throw new Error('Admin account was created. Confirm the email in Supabase/Auth email, then sign in again.');
      } catch {
        throw new Error('Admin account is not ready in Supabase. Run the Supabase schema/migration first, then create or confirm the admin user.');
      }
    }

    throw err;
  }

  storeSession(session);
  return session;
};

export const signInWithOAuthProvider = (provider) => {
  requireConfig();

  const redirectTo = `${window.location.origin}/login`;
  const params = new URLSearchParams({
    provider,
    redirect_to: redirectTo,
  });

  window.location.assign(`${SUPABASE_URL}/auth/v1/authorize?${params.toString()}`);
};

export const refreshSession = async (session) => {
  if (!session?.refresh_token) {
    return null;
  }

  const refreshedSession = await request('/auth/v1/token?grant_type=refresh_token', {
    method: 'POST',
    body: {
      refresh_token: session.refresh_token,
    },
  });

  storeSession(refreshedSession);
  return refreshedSession;
};

export const getUser = async (session) => request('/auth/v1/user', { method: 'GET' }, session);

export const signOut = async (session) => {
  try {
    if (session?.access_token) {
      await request('/auth/v1/logout', { method: 'POST' }, session);
    }
  } finally {
    clearStoredSession();
  }
};

export const resendSignupConfirmation = async (email) => request('/auth/v1/resend', {
  method: 'POST',
  body: {
    type: 'signup',
    email: normalizeEmail(email),
  },
});

export const callSupabaseFunction = async (name, body, session = getStoredSession()) => {
  requireConfig();

  if (!session?.access_token) {
    throw new Error('Sign in before continuing.');
  }

  const response = await fetch(`${SUPABASE_URL}/functions/v1/${name}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  return parseResponse(response);
};

export const createRazorpayOrder = async ({ amount, currency = 'INR' }, session = getStoredSession()) => (
  callSupabaseFunction('razorpay-payment', {
    action: 'create_order',
    amount,
    currency,
    receipt: `aura_${Date.now()}`,
  }, session)
);

export const verifyRazorpayPayment = async (payment, session = getStoredSession()) => (
  callSupabaseFunction('razorpay-payment', {
    action: 'verify_payment',
    payment,
  }, session)
);

export const sendOrderCompletionMail = async (order, session = getStoredSession()) => (
  callSupabaseFunction('order-mailer', {
    type: 'order_completed',
    order: {
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      total: order.total,
      items: order.items,
    },
  }, session)
);

export const appendConfirmedOrdersToSheet = async (orders, session = getStoredSession()) => (
  callSupabaseFunction('order-sheet-sync', {
    orders: orders.map(order => ({
      orderNumber: order.orderNumber,
      status: order.status,
      date: order.date,
      completedAt: order.completedAt,
      customerName: order.customerName,
      customerEmail: order.customerEmail,
      customerPhone: order.customerPhone,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping,
      total: order.total,
      paymentProvider: order.paymentProvider,
      paymentStatus: order.paymentStatus,
      razorpayOrderId: order.razorpayOrderId,
      razorpayPaymentId: order.razorpayPaymentId,
    })),
  }, session)
);

export const restRequest = async (path, options = {}, session = getStoredSession()) => {
  const headers = {
    Prefer: options.prefer || 'return=representation',
    ...options.headers,
  };

  return request(`/rest/v1${path}`, { ...options, headers }, session);
};

const encodeStoragePath = (path) => path.split('/').map(encodeURIComponent).join('/');

export const publicStorageUrl = (path) => {
  requireConfig();
  return `${SUPABASE_URL}/storage/v1/object/public/${STORAGE_BUCKET}/${encodeStoragePath(path)}`;
};

const uploadStorageMedia = async ({ file, folder, index, failureMessage }, session = getStoredSession()) => {
  requireConfig();

  if (!session?.access_token) {
    throw new Error('Sign in as admin before uploading media.');
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop() : 'jpg';
  const safeName = `${Date.now()}-${index}.${extension}`.toLowerCase();
  const path = `${folder}/${safeName}`;

  const response = await fetch(`${SUPABASE_URL}/storage/v1/object/${STORAGE_BUCKET}/${encodeStoragePath(path)}`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${session.access_token}`,
      'Content-Type': file.type || 'application/octet-stream',
      'x-upsert': 'true',
    },
    body: file,
  });

  if (!response.ok) {
    const text = await response.text();
    const data = text ? JSON.parse(text) : null;
    throw new Error(friendlySupabaseError(data?.message || failureMessage || 'Media upload failed.'));
  }

  return publicStorageUrl(path);
};

export const uploadProductImage = async ({ file, productId, index }, session = getStoredSession()) => (
  uploadStorageMedia({
    file,
    folder: productId,
    index,
    failureMessage: 'Product image upload failed.',
  }, session)
);

export const uploadProductImages = async ({ files, productId }, session = getStoredSession()) => {
  const fileList = Array.from(files || []);

  if (fileList.length === 0) {
    return [];
  }

  return Promise.all(fileList.map((file, index) => uploadProductImage({ file, productId, index }, session)));
};

export const getFrontMedia = async () => {
  const rows = await restRequest(`/site_assets?key=eq.${encodeURIComponent(FRONT_IMAGE_KEY)}&select=image_urls`, {
    cache: 'no-store',
    headers: { Prefer: '' },
  });

  return Array.isArray(rows?.[0]?.image_urls) ? rows[0].image_urls : [];
};

export const saveFrontMedia = async (mediaUrls) => {
  const rows = await restRequest('/site_assets?on_conflict=key', {
    method: 'POST',
    prefer: 'resolution=merge-duplicates,return=representation',
    body: {
      key: FRONT_IMAGE_KEY,
      image_urls: Array.from(new Set((mediaUrls || []).filter(Boolean))),
    },
  });

  return Array.isArray(rows?.[0]?.image_urls) ? rows[0].image_urls : [];
};

export const uploadFrontMedia = async ({ files }, session = getStoredSession()) => {
  const fileList = Array.from(files || []);

  if (fileList.length === 0) {
    return [];
  }

  return Promise.all(fileList.map((file, index) => uploadStorageMedia({
    file,
    folder: FRONT_IMAGE_KEY,
    index,
    failureMessage: 'Front media upload failed.',
  }, session)));
};

export const getFrontImages = getFrontMedia;
export const saveFrontImages = saveFrontMedia;
export const uploadFrontImages = uploadFrontMedia;
