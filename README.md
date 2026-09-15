# RB Bearings — student project

A recreation of the shopping experience from bearings-online.co.uk, rebranded as **RB Bearings**, built as a static site for Netlify.

- Product photos and the hero video are hotlinked directly from the original site (bearings-online.co.uk) — no images are hosted in this repo.
- The basket is stored in the browser (`localStorage`) — nothing is sent anywhere until checkout.
- There is **no payment processing**. Checkout and the contact page are Netlify Forms: submitting them emails the order/enquiry to your team instead of taking a payment.

## Deploying

1. Push this folder to Netlify (drag-and-drop the folder in the Netlify dashboard, or connect it as a git repo). No build command is needed — publish directory is `.`.
2. Point your domain (`rb-bearings.com`) at the Netlify site in **Site settings → Domain management**.

## Turning on order emails (do this after the first deploy)

Netlify only detects the two forms (`order` on the checkout page, `contact` on the Contact Us page) once they've been deployed — then:

1. Go to **Site settings → Forms → Form notifications**.
2. Click **Add notification → Email notification**.
3. Set it to notify **info@rb-bearings.com** whenever the **order** form is submitted. Repeat for the **contact** form.
4. Optionally enable reCAPTCHA or check **Site settings → Forms → Spam filters** — a honeypot field (`bot-field`) is already built into both forms.

Until this is configured, form submissions still land in **Site → Forms** in the Netlify dashboard, they just won't trigger an email.

## Editing product data

All sample products (67 across 8 categories) live in [assets/js/products.js](assets/js/products.js) as a single `PRODUCTS` array. Category and product pages render from this file at load time — add, edit or remove entries there rather than editing individual HTML pages.

## What's simplified vs. the original site

- Only a sample of products per category is included (not the full 20,000+ SKU catalogue).
- Multi-currency switching, live size-based search filters and customer accounts were left out as out of scope for this project.
- The original site's own logo/wordmark was not reused (it names the real company) — this project uses a plain text "RB Bearings" wordmark instead.
