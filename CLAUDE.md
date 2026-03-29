# Yana Nagaland — CLAUDE.md

## Project
- Site: yananagaland.com
- Repo: github.com/jameskikonkikon-prog/DiscoverNagaland
- Vercel project: discover-nagaland-bjtb
- Tech: Next.js 14, Supabase, Razorpay, Resend, Vercel

## Working Style
- Owner has zero coding experience
- Keep responses short
- Test on preview first, merge manually
- Don't touch payments/auth unless asked
- Always read CLAUDE.md first

## What's Built and Working
- Business directory with search, AI tools, listing health, analytics
- Real Estate vertical (browse, detail, owner dashboard, add/edit/refresh/mark sold)
- Two-column redesigned detail pages (Business and RE)
- Smart login redirect (biz only → /dashboard, prop only → /re/dashboard, both → /account)
- Email verification on signup, password reset flow
- Lead tracking (call/WhatsApp/view clicks stored in lead_events table)
- Business dashboard with real lead stats (4 cards)
- RE pricing: 3 tiers (Starter ₹499, Pro ₹799, Agent ₹1,499) with 7-day free trial
- RE Razorpay payments wired
- Legal pages: privacy, terms, refund, contact, about
- Footer, 404 page, favicon, page titles, OG meta tags
- Consent banner, registration terms checkbox
- Loading states, success toasts
- Search page: fuzzy search, filter chips, shows related results when filters return nothing

## WhatsApp Setup (28 March 2026)
- Meta Developer account created
- App created: YanaNagaland (App ID: 2366347277161967)
- WhatsApp Business Platform added
- Webhook created at /api/whatsapp/webhook
- Webhook verified and messages field subscribed
- whatsapp_sessions table created in Supabase
- Env vars added to Vercel: WHATSAPP_ACCESS_TOKEN, WHATSAPP_PHONE_NUMBER_ID, WHATSAPP_VERIFY_TOKEN
- Phone number ID: 1129998533519613
- WhatsApp Business Account ID: 3978817235744114
- Meta business verification submitted with Udyam certificate UDYAM-NL-01-0014410 (in review, ~2 working days)
- Once verified: add real phone number and build full bot flow

## Still To Do
- Fix search page crash (client-side exception)
- Search API: detect price from query text (e.g. "under ₹3000")
- WhatsApp bot conversation flow (list business/property via WhatsApp)
- WhatsApp OTP login
- WhatsApp booking button
- Weekly analytics via WhatsApp
- Registration flow fix (business details lost after email verify)
- Mobile responsiveness check
- Full testing before launch

## Database Tables
- lead_events (id, business_id, property_id, event_type, created_at)
- whatsapp_sessions (id, phone, last_message, last_message_id, updated_at, created_at)
- properties: plan, trial_ends_at, plan_expires_at columns
- payments: user_id, payment_type columns

## Environment Variables (Vercel)
- WHATSAPP_ACCESS_TOKEN
- WHATSAPP_PHONE_NUMBER_ID
- WHATSAPP_VERIFY_TOKEN = (stored in Vercel env, do not commit)

## Business Registration
- Udyam Registration: UDYAM-NL-01-0014410
- Business type: Proprietary / Web Portal
- NIC Code: 63122
