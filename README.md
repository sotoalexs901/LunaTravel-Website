# FreshBorn Cleaning Services

A Fresh Start for Every Space. Family-owned residential and commercial cleaning in Tampa Bay.

Production website: https://freshborncleaning.com/

## Website and portals

- `index.html`: bilingual public website, services, quote request, FreshBorn content and Crisp chat.
- `self-quote.html`: cleaning estimate; `self-quote-admin.html`: pricing management.
- `admin.html`, `admin.js`: Firebase administrator access and customer management.
- `content-manager.html`: FreshBorn photos and offers.
- `staff-management.html`: invitations, permanent employee numbers, SMS consent, assignments and visits.
- `staff-portal.html`: staff attendance, visit progress, photos and report submission.
- `staff-review.html`: administrator review before client publication.
- `client-portal.html`, `client-service.html`: VIP account and approved service records.
- `staff-sms-consent.html`, `privacy.html`, `terms.html`: consent and policy pages.
- `app.html`, `notifications.html`, `manifest.webmanifest`, `sw.js`: browser installation and assignment alerts.

## Hosting and backend

Netlify hosts the static HTML, CSS and JavaScript site. `netlify/functions/` contains the backend, with shared notification delivery in `netlify/lib/notifications.js`. Firebase provides authentication, Firestore and Storage. Resend handles email, Twilio handles opted-in staff invitations, and Crisp provides support chat.

Credentials belong in Netlify environment variables. Never commit private keys, API secrets, invitation links or service-account JSON. `assets/firebase-config.js` and `assets/firebase-push-config.js` hold the public Firebase web configuration.

See `README_MOBILE_APP.txt` for app installation, Firebase Web Push setup and device checks.

## Retired pages

The obsolete travel website pages, static travel data and unused Netlify CMS configuration have been removed. `_redirects` preserves former service, pricing, contact, tracking and CMS entry URLs by directing them to FreshBorn pages. The repository retains its existing GitHub name; no hosting or GitHub connection is renamed.

## Portal languages

Staff and customer pages offer an English/Español selector. The device remembers the preference in `freshborn-lang`; changes apply without reloading or replacing open forms. `assets/portal-i18n.js` manages the selector and reversible interface translations, with Spanish strings in `assets/portal-translations.js`. User-authored names, addresses, reports, notes and captions retain their original text. App notification text follows the device language after the service worker update is applied.

## Administrator finance

`admin-finance.html` records received customer payments, expenses and outgoing investments through the administrator-only `admin-finance` Netlify function. Data lives under `adminFinance/freshborn/entries`; voids and name changes retain an audit trail. Entries are idempotent and money is stored in integer USD cents. No bank transfer or payment collection is performed.

The requested internal formula is receipts minus all recorded expenses and investments. Shared costs (including website/insurance when entered) are deducted once and allocated among customers by their proportion of receipts in that selected period. If the period has no receipts, shared costs stay unallocated and reduce the overall result. Four people each have a 25% share of positive net profit for the selected period; customer-level losses offset gains before the period distribution. These settings do not change quote prices or contracts.

Each entry is dated once; recurring costs must be recorded for each month. Only posted cash receipts count, not scheduled services or unpaid quotes. No existing financial amounts or names are preloaded. Rounding preserves every cent; a one-cent difference among shares is possible. The API refuses more than 500 entries in a selected period or 500 customer records rather than showing partial financial totals.

Finance opens with all recorded dates so initial investments and prior losses are included in the cumulative result. A selected-month view is available separately; its distribution is that month's result only.
