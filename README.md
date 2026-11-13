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

The requested internal formula is receipts minus all recorded expenses and investments. Shared costs (including website/insurance when entered) are deducted once and allocated among customers by their proportion of receipts in that selected period. If the period has no receipts, shared costs stay unallocated and reduce the overall result. Customer-level losses offset gains before employee earnings can be approved. These settings do not change quote prices or contracts.

Each entry is dated once; recurring costs must be recorded for each month. Only posted cash receipts count, not scheduled services or unpaid quotes. No existing financial amounts or names are preloaded. Rounding preserves every cent; a one-cent difference among shares is possible. The API refuses more than 500 entries in a selected period or 500 customer records rather than showing partial financial totals.

Finance opens with all recorded dates so initial investments and prior losses are included in the cumulative result. A selected-month view is available separately; its reserve card describes that month only. Service approvals and the company net panel always use the cumulative ledger.

## Service-based employee earnings

The fixed four-name calculator is superseded by service-based employee plans. Existing ledger entries and legacy name settings remain stored. Add employees through the existing staff invitation/activation process, link a received payment to a service for that same customer, select the employees who performed it, and save percentages of that service's remaining pool. Percentages may total less than 100%; the unassigned portion remains with the company.

The company reserves 13% of positive profit AFTER recorded costs/investments (rounded up to a cent). Remaining funds are allocated across positive customer results after global losses, then across that customer's receipts by service. Unlinked receipts and incomplete services cannot produce approved employee earnings. The server rejects approvals beyond the unreserved budget. If later costs/voids create a shortfall, the panel flags it; previously approved earnings remain locked rather than being silently rewritten.

Approve earnings explicitly once the service is completed and paid. Approval stores a transaction-protected snapshot under adminFinance/freshborn/serviceEarnings with participant UIDs, percentages, amounts and the New York completion month. Duplicate approval is idempotent. Staff can read only their own approved monthly amounts through the authenticated staff-earnings action; company totals and other employees' shares are never returned to that action. Approval records earnings, not a bank transfer. Do not record the same approved employee shares again as expenses.

## Customer online payments (Stripe Checkout)

In Finance, issue a fixed USD payment request for a service, using the final agreed amount (the quote is only a prefill). The activated customer signs into their portal and chooses Pay securely. Checkout is Stripe-hosted: this site never receives card numbers. This release collects one-time service payments, not recurring subscriptions. Available card wallets depend on Stripe, the device, and eligibility. No public publishable key is needed for the hosted redirect.

Activation in Netlify (Functions scope, never browser code):
- `STRIPE_SECRET_KEY`: start with the secret key from your Stripe sandbox/test account.
- `STRIPE_WEBHOOK_SECRET`: the signing secret for the endpoint below in that same sandbox/account.
- `STRIPE_PAYMENTS_ENABLED`: `true` after configuring the endpoint. Missing values disable checkout and issuing requests.
- `PUBLIC_SITE_URL`: retain `https://freshborncleaning.com`.

Register `https://freshborncleaning.com/.netlify/functions/stripe-webhook` in Stripe Workbench/Webhooks. Subscribe to `checkout.session.completed`, `checkout.session.async_payment_succeeded`, `checkout.session.expired`, and `charge.refunded`. Use snapshot events, not thin events. Redeploy after environment changes. Keep the webhook endpoint and both secrets configured for ongoing payment/refund synchronization. Setting STRIPE_PAYMENTS_ENABLED to false pauses new checkouts but does not disable verification of existing payments/refunds.

Test first with a test service/customer and Stripe test card 4242 4242 4242 4242, any future expiry and any CVC. Test success, decline (4000 0000 0000 0002), cancellation, duplicate webhook delivery, expiry and refunds before replacing BOTH secrets with live-account values. Test invoices are separated by livemode and NEVER enter Finance or employee earnings. Changing mode is determined by the server secret key. Only enable live mode after Stripe activates your merchant account and your bank payout details are configured. Never send secret keys in chat or commit them.

Confirmed live payments create an idempotent receipt in `adminFinance/freshborn/entries`, linked to the invoice/customer/service. The raw webhook signature is verified with the official Stripe SDK and the authoritative Checkout Session is retrieved before recording income. Return URL parameters never mark a payment paid. Replayed events do not duplicate income. Refund notifications retrieve the current Stripe charge, update cumulative refunded cents and reduce the original receipt (a full refund voids it), retaining the gross amount and audit record. Existing approved staff earnings stay locked; the company reserve warning applies if refunds reduce available funds. Refunds are initiated in Stripe, not through the site. Disputes/chargebacks and processing fees require administrator reconciliation in Stripe and Finance; processing fees are not automatically imported.

Invoice amounts are locked when created; an administrator can cancel an open request and create a replacement. Once checkout has started, wait for the Stripe expiry event to reopen it before cancellation/reissue. A single invoice attempt uses a durable idempotency key across concurrent/lost-response retries. In the rare case where checkout creation remains unresolved for 23 hours, it fails closed and requires Stripe reconciliation before retrying. Do not manually enter an online receipt or relink/void it; Stripe owns those records. Existing unrelated manual receipts are preserved. Invoice and receipt queries refuse over 500 records rather than silently truncating.
