import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) => new Response(JSON.stringify(body), {
  status,
  headers: {
    ...corsHeaders,
    "Content-Type": "application/json",
    "Connection": "keep-alive",
  },
});

const formatCurrency = (value: unknown) => `Rs. ${Number(value || 0).toLocaleString("en-IN")}`;

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ message: "Method not allowed." }, 405);
  }

  try {
    const payload = await req.json();
    const order = payload.order as {
      orderNumber?: string;
      customerName?: string;
      customerEmail?: string;
      total?: number;
      items?: Array<{ name?: string; quantity?: number; price?: number }>;
    };

    if (payload.type !== "order_completed" || !order?.customerEmail || !order?.orderNumber) {
      return jsonResponse({ message: "Missing order mail details." }, 400);
    }

    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const fromEmail = Deno.env.get("ORDER_MAIL_FROM") || "Aura By Yash <onboarding@resend.dev>";

    if (!resendApiKey) {
      return jsonResponse({
        sent: false,
        message: "RESEND_API_KEY is not configured in Supabase Edge Function secrets.",
      });
    }

    const items = Array.isArray(order.items) ? order.items : [];
    const itemHtml = items.map(item => (
      `<li>${item.name || "Product"} x${item.quantity || 1} - ${formatCurrency(Number(item.price || 0) * Number(item.quantity || 1))}</li>`
    )).join("");

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [order.customerEmail],
        subject: `Your Aura order ${order.orderNumber} is packed`,
        html: `
          <div style="font-family:Arial,sans-serif;color:#111;line-height:1.6">
            <h2>Your order is packed and ready to ship.</h2>
            <p>Hi ${order.customerName || "there"},</p>
            <p>Your Aura By Yash order <strong>${order.orderNumber}</strong> is packed and ready to ship.</p>
            <ul>${itemHtml}</ul>
            <p><strong>Total:</strong> ${formatCurrency(order.total)}</p>
            <p>We will share the next shipping update soon.</p>
          </div>
        `,
        text: `Your Aura By Yash order ${order.orderNumber} is packed and ready to ship. Total: ${formatCurrency(order.total)}.`,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      return jsonResponse({
        sent: false,
        message: data.message || data.error?.message || "Order mail failed.",
      }, response.status);
    }

    return jsonResponse({ sent: true, id: data.id });
  } catch (err) {
    return jsonResponse({ message: err instanceof Error ? err.message : "Order mail request failed." }, 500);
  }
});
