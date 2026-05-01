# Aura-By-Yash

## Deployment Environment

The app includes a public Supabase fallback for the current project, but hosted builds can also set these variables:

```bash
VITE_SUPABASE_URL=https://vfowybrltwgeajtbwqvf.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_qrXSKHg3imF31IYUKkPXUg_ZZDnv3o5
```

## Supabase Edge Function Secrets

For redeploying the Razorpay Edge Function, set these Supabase function secrets:

```bash
RAZORPAY_KEY_ID=rzp_test_SjqUDrxfrYV6wX
RAZORPAY_KEY_SECRET=<your Razorpay secret>
RESEND_API_KEY=<your Resend API key for order emails>
ORDER_MAIL_FROM="Aura By Yash <orders@yourdomain.com>"
```
