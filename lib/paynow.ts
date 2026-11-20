// Paynow Zimbabwe (EcoCash, OneMoney, cards). Docs: https://developers.paynow.co.zw
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Paynow } = require('paynow');

export function paynow(returnPath = '/employer/billing?done=1') {
  const site = siteUrl();
  const p = new Paynow(process.env.PAYNOW_INTEGRATION_ID, process.env.PAYNOW_INTEGRATION_KEY);
  p.resultUrl = `${site}/api/paynow/result`;
  p.returnUrl = `${site}${returnPath}`;
  return p;
}

// Public address of the site (never the internal Render host).
export function siteUrl() {
  return (process.env.NEXT_PUBLIC_SITE_URL || 'https://tigermaxjobs.com').replace(/\/+$/, '');
}

// While the Paynow integration is in TEST MODE, Paynow only accepts payments whose authemail is the
// merchant account's login email. Set PAYNOW_TEST_EMAIL in Render to that email for the test
// transaction, then DELETE it once Paynow sets the integration live, so customers get their own receipts.
export function payerEmail(email?: string | null) {
  return process.env.PAYNOW_TEST_EMAIL || email || 'admin@tigermaxjobs.com';
}
