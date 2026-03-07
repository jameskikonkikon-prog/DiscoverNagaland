# Yana Nagaland — CLAUDE.md

## Project Overview
Yana Nagaland is an AI-powered business directory for Nagaland, India.
Live at: yananagaland.com
Vercel project: discover-nagaland-bjtb.vercel.app
GitHub: jameskikonkikon-prog/DiscoverNagaland

## Tech Stack
- Frontend: Next.js
- Database: Supabase
- Payments: Razorpay
- AI: Anthropic Claude API (claude-sonnet-4-20250514)
- Hosting: Vercel
- Auth: Supabase Auth

## Environment Variables
- ANTHROPIC_API_KEY
- RAZORPAY_KEY_ID
- RAZORPAY_KEY_SECRET
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- NEXT_PUBLIC_APP_URL

## Plans
- Basic — free forever
- Pro — free for first 100 businesses, then Rs.299/month
- Plus — Rs.499/month, no trial

## Design
- Background: #0a0a0a
- Accent: #c0392b red
- Font: Sora
- Mobile responsive always

## Git Rules
- Always push to claude/* branch
- Never push directly to main
- After finishing — remind user to merge PR on GitHub

## Self Testing Rules
- After every change — test every affected feature yourself before saying done
- If something is broken — debug and fix it yourself, don't report it as done
- If a fix doesn't work — keep trying until it works
- Check both desktop and mobile
- Verify live on yananagaland.com after every deployment
- Only tell user it's done when you have personally confirmed it works
