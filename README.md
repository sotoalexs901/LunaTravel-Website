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
