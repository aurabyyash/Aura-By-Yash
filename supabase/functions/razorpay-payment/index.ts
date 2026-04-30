import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const keyId = Deno.env.get("RAZORPAY_KEY_ID") || "rzp_test_SjqUDrxfrYV6wX";
const keySecret = Deno.env.get("RAZORPAY_KEY_SECRET");

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Connection": "keep-alive",
  },
});

const requireRazorpaySecret = () => {
  if (!keySecret) {
    throw new Error("Missing RAZORPAY_KEY_SECRET.");
  }

  return keySecret;
};

const createRazorpayOrder = async (payload: Record<string, unknown>) => {
  const secret = requireRazorpaySecret();

  const amount = Math.round(Number(payload.amount || 0) * 100);

  if (!Number.isFinite(amount) || amount <= 0) {
    return jsonResponse({ message: "Invalid payment amount." }, 400);
  }

  const response = await fetch("https://api.razorpay.com/v1/orders", {
    method: "POST",
    headers: {
      "Authorization": `Basic ${btoa(`${keyId}:${secret}`)}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      amount,
      currency: payload.currency || "INR",
      receipt: payload.receipt || `aura_${Date.now()}`,
      payment_capture: 1,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    return jsonResponse({
      message: data.error?.description || "Could not create Razorpay order.",
    }, response.status);
  }

  return jsonResponse({
    id: data.id,
    amount: data.amount,
    currency: data.currency,
    receipt: data.receipt,
    keyId,
  });
};

const hmacSha256 = async (message: string, secret: string) => {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, encoder.encode(message));

  return Array.from(new Uint8Array(signature))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
};

const verifyRazorpayPayment = async (payload: Record<string, unknown>) => {
  const secret = requireRazorpaySecret();

  const payment = payload.payment as Record<string, string> | undefined;
  const orderId = payment?.razorpay_order_id;
  const paymentId = payment?.razorpay_payment_id;
  const signature = payment?.razorpay_signature;

  if (!orderId || !paymentId || !signature) {
    return jsonResponse({ message: "Missing Razorpay payment details." }, 400);
  }

  const expectedSignature = await hmacSha256(`${orderId}|${paymentId}`, secret);
  const valid = expectedSignature === signature;

  if (!valid) {
    return jsonResponse({ message: "Razorpay payment verification failed.", valid: false }, 400);
  }

  return jsonResponse({ valid: true });
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

    if (payload.action === "create_order") {
      return await createRazorpayOrder(payload);
    }

    if (payload.action === "verify_payment") {
      return await verifyRazorpayPayment(payload);
    }

    return jsonResponse({ message: "Unknown Razorpay action." }, 400);
  } catch (err) {
    return jsonResponse({ message: err instanceof Error ? err.message : "Razorpay request failed." }, 500);
  }
});
