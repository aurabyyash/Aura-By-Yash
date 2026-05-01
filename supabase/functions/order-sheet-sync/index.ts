import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const DEFAULT_SHEET_ID = "1CgZUdrsmz9VzpbGB9EsN6_rj1CwYkBImFKM4b72Edmo";
const DEFAULT_SHEET_NAME = "Confirmed Orders";
const SHEET_HEADERS = [
  "Order Number",
  "Status",
  "Placed At",
  "Completed At",
  "Customer Name",
  "Customer Email",
  "Customer Phone",
  "Items",
  "Subtotal",
  "Shipping",
  "Total",
  "Payment Provider",
  "Payment Status",
  "Razorpay Order ID",
  "Razorpay Payment ID",
  "Synced At",
];

type SheetOrder = {
  orderNumber?: string;
  status?: string;
  date?: string;
  completedAt?: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  items?: Array<{ name?: string; quantity?: number; price?: number }>;
  subtotal?: number;
  shipping?: number;
  total?: number;
  paymentProvider?: string;
  paymentStatus?: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Connection": "keep-alive",
  },
});

const base64Url = (input: string | Uint8Array) => {
  const bytes = typeof input === "string" ? new TextEncoder().encode(input) : input;
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
};

const privateKeyToBytes = (privateKey: string) => {
  const normalizedKey = privateKey.replace(/\\n/g, "\n");
  const cleanKey = normalizedKey
    .replace("-----BEGIN PRIVATE KEY-----", "")
    .replace("-----END PRIVATE KEY-----", "")
    .replace(/\s/g, "");
  const binary = atob(cleanKey);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
};

const readServiceAccount = () => {
  const rawJson = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON");
  const base64Json = Deno.env.get("GOOGLE_SERVICE_ACCOUNT_JSON_BASE64");

  if (base64Json) {
    const credentials = JSON.parse(atob(base64Json));
    return {
      email: credentials.client_email as string,
      privateKey: credentials.private_key as string,
    };
  }

  if (rawJson) {
    const credentials = JSON.parse(rawJson);
    return {
      email: credentials.client_email as string,
      privateKey: credentials.private_key as string,
    };
  }

  return {
    email: Deno.env.get("GOOGLE_SERVICE_ACCOUNT_EMAIL") || "",
    privateKey: Deno.env.get("GOOGLE_PRIVATE_KEY") || "",
  };
};

const getAccessToken = async () => {
  const { email, privateKey } = readServiceAccount();

  if (!email || !privateKey) {
    throw new Error("Google service-account secrets are not configured.");
  }

  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = base64Url(JSON.stringify({
    iss: email,
    scope: "https://www.googleapis.com/auth/spreadsheets",
    aud: "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const unsignedToken = `${header}.${payload}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    privateKeyToBytes(privateKey),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign(
    "RSASSA-PKCS1-v1_5",
    key,
    new TextEncoder().encode(unsignedToken),
  );
  const assertion = `${unsignedToken}.${base64Url(new Uint8Array(signature))}`;
  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion,
    }),
  });
  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Google authentication failed.");
  }

  return data.access_token as string;
};

const sheetsFetch = async (url: string, accessToken: string, options: RequestInit = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Authorization": `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    throw new Error(data?.error?.message || "Google Sheets request failed.");
  }

  return data;
};

const rangeUrl = (sheetId: string, sheetName: string, range: string) => {
  const encodedRange = encodeURIComponent(`${sheetName}!${range}`);
  return `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodedRange}`;
};

const ensureSheet = async (sheetId: string, sheetName: string, accessToken: string) => {
  const metadata = await sheetsFetch(
    `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}?fields=sheets.properties.title`,
    accessToken,
  );
  const sheetExists = metadata.sheets?.some((sheet: { properties?: { title?: string } }) => (
    sheet.properties?.title === sheetName
  ));

  if (!sheetExists) {
    await sheetsFetch(`https://sheets.googleapis.com/v4/spreadsheets/${sheetId}:batchUpdate`, accessToken, {
      method: "POST",
      body: JSON.stringify({
        requests: [{ addSheet: { properties: { title: sheetName } } }],
      }),
    });
  }

  await sheetsFetch(`${rangeUrl(sheetId, sheetName, "A1:P1")}?valueInputOption=RAW`, accessToken, {
    method: "PUT",
    body: JSON.stringify({ values: [SHEET_HEADERS] }),
  });
};

const formatCurrency = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

const orderToRow = (order: SheetOrder) => {
  const items = Array.isArray(order.items) ? order.items : [];
  const itemSummary = items.map(item => (
    `${item.name || "Product"} x${item.quantity || 1} (${formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))})`
  )).join("; ");

  return [
    order.orderNumber || "",
    order.status || "Completed",
    order.date || "",
    order.completedAt || "",
    order.customerName || "",
    order.customerEmail || "",
    order.customerPhone || "",
    itemSummary,
    Number(order.subtotal || 0),
    Number(order.shipping || 0),
    Number(order.total || 0),
    order.paymentProvider || "",
    order.paymentStatus || "",
    order.razorpayOrderId || "",
    order.razorpayPaymentId || "",
    new Date().toISOString(),
  ];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405);
  }

  try {
    const payload = await req.json();
    const orders = Array.isArray(payload.orders) ? payload.orders as SheetOrder[] : [];

    if (orders.length === 0) {
      return jsonResponse({ synced: true, syncedOrderNumbers: [], skippedOrderNumbers: [], message: "No orders to sync." });
    }

    const sheetId = Deno.env.get("GOOGLE_SHEET_ID") || DEFAULT_SHEET_ID;
    const sheetName = Deno.env.get("GOOGLE_SHEET_NAME") || DEFAULT_SHEET_NAME;
    const accessToken = await getAccessToken();

    await ensureSheet(sheetId, sheetName, accessToken);

    const existingData = await sheetsFetch(rangeUrl(sheetId, sheetName, "A2:A"), accessToken);
    const existingOrderNumbers = new Set((existingData.values || []).flat().filter(Boolean));
    const newOrders = orders.filter(order => order.orderNumber && !existingOrderNumbers.has(order.orderNumber));
    const skippedOrderNumbers = orders
      .filter(order => order.orderNumber && existingOrderNumbers.has(order.orderNumber))
      .map(order => order.orderNumber);

    if (newOrders.length > 0) {
      await sheetsFetch(`${rangeUrl(sheetId, sheetName, "A2")}:append?valueInputOption=USER_ENTERED&insertDataOption=INSERT_ROWS`, accessToken, {
        method: "POST",
        body: JSON.stringify({ values: newOrders.map(orderToRow) }),
      });
    }

    return jsonResponse({
      synced: true,
      syncedOrderNumbers: newOrders.map(order => order.orderNumber),
      skippedOrderNumbers,
      message: `${newOrders.length} orders added to Google Sheet.`,
    });
  } catch (err) {
    return jsonResponse({
      synced: false,
      syncedOrderNumbers: [],
      skippedOrderNumbers: [],
      message: err instanceof Error ? err.message : "Google Sheet sync failed.",
    });
  }
});
