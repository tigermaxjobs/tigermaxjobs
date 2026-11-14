// Paynow Zimbabwe (EcoCash, OneMoney, cards). Docs: https://developers.paynow.co.zw
// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Paynow } = require('paynow');

export function paynow(returnPath = '/employer/billing?done=1') {
  const site = process.env.NEXT_PUBLIC_SITE_URL;
  const p = new Paynow(process.env.PAYNOW_INTEGRATION_ID, process.env.PAYNOW_INTEGRATION_KEY);
  p.resultUrl = `${site}/api/paynow/result`;
  p.returnUrl = `${site}${returnPath}`;
  return p;
}
