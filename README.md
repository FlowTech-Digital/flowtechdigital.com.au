# FlowTech Digital

Static source for [flowtechdigital.com.au](https://flowtechdigital.com.au), hosted on Cloudflare Pages. Existing Claude-built HTML and brand assets remain the foundation; shared navigation, local licensed fonts and scoped service enquiries were added in October 2026.

## Offers

Prices are AUD, including GST where applicable. Eligibility, access and written scope are confirmed before invoicing.

| Service | Price | Boundary |
| --- | --- | --- |
| Website Fix Sprint | $295 | One eligible issue, up to two delivery hours, one correction round within the agreed scope |
| Brand Polish Pack | $495 | Existing usable identity; avatar, two covers, styling sheet, organised files; one consolidated revision; up to four delivery hours |
| Launch / Business / Pro websites | From $2,000 / $4,000 / $7,000 | Final written scope and quote |
| Logo Essentials / Brand Identity | From $990 / $2,750 | Final written scope and quote |
| Brand Launch Bundle | From $4,950 | Brand Identity + Business website; $1,800 below their $6,750 combined starting prices |
| Basic / Standard / Plus Care | $99 / $199 / $399 monthly | Eligible supported platforms; content allowance of 20 / 60 / 120 minutes, no rollover; defined maintenance separate from content time |

Care is optional. Domains and other third-party charges are stated in the quote. New small-job offers use the existing enquiry endpoint and a scope-first invoice process; no new Stripe products or payment links are assumed.

## Build and verify

Requires Python 3.12+ and Node 24 in CI. Locally an installed compatible Python/Node and Chrome may be used.

```text
npm ci
npx playwright install --with-deps chromium
npm run build
npm test
```

`tools/build_site.py` creates a curated `site-dist` containing public assets and pages only. Tooling, source notes, Git data, dependency folders and QA reports are excluded. `tools/check_site.cjs` serves that output in an isolated browser, checks nine routes at four widths, internal assets/links, mobile navigation, offer selection, no-JavaScript access and mocked success/failure/retry submission behavior. All third-party requests are intercepted during QA; these tests never send an actual enquiry or contact a customer.

Optional environment variables: `PLAYWRIGHT_MODULE`, `CHROME_EXECUTABLE`, `SITE_ROOT` and `QA_OUTPUT`. QA produces a JSON report with file hashes and desktop/mobile screenshots. Serve `site-dist` over HTTP for a working local preview; opening pages as `file://` will not resolve root-relative URLs.

## Release

Pull requests run `.github/workflows/site-checks.yml`. The existing main-branch deployment now waits for those checks and deploys `site-dist` to Cloudflare project `flowtechdigital-com-au`. A manual deployment also requires the `main` ref. Existing Cloudflare secret names are retained; no credentials are embedded in the site or tooling.

Merging into `main` publishes the public site and offers. Review the prices, care commitments and scope first. Browser QA verifies submission handling with a mock endpoint; it does not prove real Formspree receipt, owner notification, Stripe payment or physical-phone behavior. Confirm a real owner-authorized test enquiry is received before actively promoting the new enquiry flow. A branch alone does not create a hosted preview with the current workflow.

Contact: hello@flowtechdigital.com.au · 0477 482 827 · ABN 76 689 878 420.
