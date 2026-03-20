# CLAUDE.md
## Project
Yana Nagaland
Main live domain: `yananagaland.com`
Correct Vercel project: `discover-nagaland-bjtb`
---
## How to work in this repo
### Response style
Keep responses short and easy to read.
Default reply format:
1. Files changed
2. What changed
3. Anything I need to do manually
Do not give long explanations unless asked.
---
## Working rules
### Safe change policy
- Keep changes narrow and safe
- Minimal file changes only
- Do not refactor unrelated files
- Do not redesign unrelated UI
- Do not touch payments unless explicitly asked
- Do not touch auth broadly unless explicitly asked
- Do not tell me to merge
- I test on preview first, then I merge manually on GitHub
### Token-saving behavior
For normal frontend tasks:
- make the change directly
- avoid long plans
- avoid printing large unchanged code blocks
For risky tasks:
- SQL
- auth
- payments
- security
- destructive changes
- storage policy changes
Stop first and clearly show:
- exact risky part
- exact files / SQL involved
- what could break
### Scope discipline
Do one focused task at a time unless I clearly ask for a larger related batch.
Good to batch together:
- same-page UI polish
- one feature area with closely related files
- one page + its supporting small route
Do NOT batch together:
- UI + SQL + auth
- dashboard + payments
- media + pricing + access control
- unrelated verticals
---
## Important repo / product direction
### Overall product
Yana Nagaland has multiple verticals.
Current important verticals:
- Business directory
- Real Estate
These should stay clearly separated where appropriate.
---
## Real Estate rules
### Product structure
Real Estate is a separate vertical inside the same website.
It must stay:
- separate from the normal business dashboard
- separate in pricing later
- separate in owner flows
But it can share:
- the same account system
- shared login/register
- shared owner hub
- shared upload API pattern
### Dashboard structure
Do NOT merge Business and Real Estate dashboards into one messy dashboard.
Current intended structure:
- `/dashboard` → Business dashboard
- `/real-estate/dashboard` → Real Estate dashboard
- `/account` → shared owner hub / switcher
One account can own:
- business listings
- real estate listings
- or both
### Real Estate is property-first
Do NOT make Real Estate dealer-profile-first.
Do NOT make it normal business-first.
Public browsing must stay property-first.
### Real Estate owner wording
Do NOT use business-claim wording for Real Estate.
Use wording like:
- List Your Property
- Owner Dashboard
- Manage Listings
- My Listings
Do NOT introduce:
- Claim your business
- Claim property
- Claim listing
for Real Estate unless explicitly asked later.
---
## Current expected live Real Estate state
### Public routes
- `/real-estate` — public browse (live)
- `/real-estate/[id]` — property detail page (live)
- Public browse only shows `is_available = true` and `last_verified_at` within 30 days
### Owner routes
- `/real-estate/dashboard` — my listings (live)
- `/real-estate/dashboard/add-property` (live)
- `/real-estate/dashboard/edit/[id]` (live)
### API routes
- `/api/real-estate` — GET (public browse), POST (create), PUT (edit), PATCH (verify/status)
- `/api/real-estate/[id]` — GET single property
- `/api/real-estate/verify` — POST refresh/verify listing
All routes merged to main.
### Real Estate owner capabilities already expected
- add property
- edit property
- view my listings
- refresh listing
- mark unavailable / sold / rented
### Real Estate freshness logic
Keep this simple.
Do NOT add cron or listing_status unless explicitly requested.
Current freshness model:
- `last_verified_at` only
- public listings must be fresh within 30 days
- owner dashboard derives:
  - Active
  - Expiring Soon
  - Expired
### Real Estate detail page
Public property cards should link to `/real-estate/[id]`.
Detail page uses two-column layout with photo grid and sidebar (contact, location, share).
Broken image fallback is in place on all photos.
---
## Business rules
### Business dashboard
Business dashboard remains separate from Real Estate.
Do not mix business flows into Real Estate flows.
### Claim flow
Normal business claim flow already exists.
Do not reuse claim flow language or structure for Real Estate.
### Business media
Business photos use the existing `business-photos` bucket.
Do NOT create duplicate business media buckets unless explicitly approved.
### Business detail page
Detail page uses two-column layout with photo grid (1 large + 2 small) and sidebar (contact, location, share).
Clean card-based sections: about, hours, features, reviews.
Broken image fallback on all photos.
Phone and hours appear only in their dedicated sections — no duplication.
---
## Shared account / owner hub
### Shared account
Shared auth/session is allowed and expected.
### Owner hub
`/account` is the shared owner switcher page.
It is not a merged dashboard.
It is only a lightweight hub.
Expected behavior:
- if owns businesses → show Business Dashboard link
- if owns properties → show Real Estate Dashboard link
- if owns neither → show CTA to register business or list property
### Smart login redirect (done)
Smart redirect is implemented in two places:
- `app/auth/callback/route.ts` — OAuth / magic link (uses service client)
- `app/login/page.tsx` — email/password and WhatsApp OTP (uses authenticated client)
Logic: biz only → `/dashboard`, prop only → `/real-estate/dashboard`, both or neither → `/account`.
Pending plan in localStorage still overrides to `/pricing`. Explicit `?redirect=` param still respected.
---
## Database / Supabase caution
### Critical note
Some Supabase changes were made manually and may not exist in repo migrations or schema files.
Do NOT assume the repo alone reflects the live database.
Before proposing destructive SQL or re-creating tables, be careful.
### Current expected Real Estate table state
`public.properties` is expected to exist already.
Expected important columns include:
- `id`
- `owner_id`
- `title`
- `property_type`
- `listing_type`
- `city`
- `locality`
- `landmark`
- `price`
- `price_unit`
- `area`
- `area_unit`
- `description`
- `photos`
- `posted_by_name`
- `phone`
- `whatsapp`
- `is_available`
- `is_featured`
- `created_at`
- `last_verified_at`
Do NOT tell me to run `CREATE TABLE properties` again unless I explicitly say the table is gone.
### Manual SQL policy
For SQL changes:
- show exact SQL first
- do not assume it has already been run unless I confirm
- avoid destructive changes unless necessary
- if altering an existing table, prefer migration SQL over re-creation SQL
---
## Storage / media rules
### Current buckets
Expected buckets:
- `property-photos` → Real Estate photos
- `business-photos` → Business photos
These should be public buckets for current image display flow.
### Upload API
A shared upload API pattern is acceptable.
Keep Business and Real Estate bucket targets separate:
- property uploads → `property-photos`
- business uploads → `business-photos`
Do NOT accidentally swap or rename these without reason.
### Media rollout order
Preferred order:
1. photos first
2. stabilize photos
3. videos later
Do NOT jump into videos before photos are stable.
### Videos
Videos are NOT built yet.
Do not start video implementation unless explicitly asked.
---
## Security rules
### Route security
Never trust client-supplied `owner_id`.
For owner writes:
- derive `owner_id` from the logged-in server session only
### Real Estate API safety
Be careful with `app/api/real-estate/route.ts`.
Expected handlers may include:
- `GET`
- `POST`
- `PUT`
- `PATCH`
Do not break handler structure.
This file previously had a compile error because a handler declaration was missing.
### Public Real Estate GET route
The public Real Estate GET route uses service client behavior.
Because of that, route-level filters are required.
Do NOT rely only on RLS for public browse.
Public GET must explicitly enforce:
- `is_available = true`
- fresh within last 30 days
### Update safety
For owner update routes:
- do not allow edits to protected fields such as:
  - `owner_id`
  - `is_featured`
  - `created_at`
  - other server-controlled fields
### Insert safety
For property creation:
- use explicit allowlist fields
- do not use unsafe broad `...rest` patterns
---
## Current Real Estate implementation expectations
### Add Property
`/real-estate/dashboard/add-property` should:
- require logged-in user
- submit to secure `POST /api/real-estate`
- never send `owner_id`
- support photos
- keep video support out for now
### Edit Property
`/real-estate/dashboard/edit/[id]` should:
- load only the logged-in owner's own property
- support editing allowed fields only
- support photo add/remove
- save via secure owner-scoped route
### Dashboard My Listings
`/real-estate/dashboard` should:
- show only rows owned by current user
- show My Listings
- show first photo thumbnail if present
- show no-photo fallback if missing or broken
### Unavailable behavior
Marking sold/rented/unavailable should set:
- `is_available = false`
Public browse should then stop showing that listing.
---
## UI / UX rules
### Homepage
Homepage should not become a giant Real Estate page.
Preferred Real Estate homepage presence:
- subtle pointer
- navbar presence
- separate landing page remains the main destination
### Real Estate styling
Keep it:
- premium
- clean
- property-first
- not crowded
Do not overbuild.
### Broken image handling
Never show ugly broken-image UI if a photo fails.
Always fall back cleanly to the no-photo placeholder.
---
## What still likely needs work
These are likely next steps unless I say otherwise:
1. Real Estate dashboard polish (not done yet)
2. Real Estate pricing / payments (not built yet)
3. Video support — planned but waiting on Supabase Pro upgrade decision
4. Video implementation — do not start until explicitly asked
---
## When uncertain
If something seems inconsistent between:
- repo code
- live preview
- manual Supabase state
Say so clearly.
Do not confidently assume the repo is the source of truth for DB/storage state.
---
## Preferred Claude behavior in this repo
- read this file first
- stay focused
- keep changes safe
- use exact file scope
- do not drift into unrelated refactors
- do not tell me to merge
- keep responses concise
