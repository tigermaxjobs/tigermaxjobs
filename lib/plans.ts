// Edit prices here. Amounts are in USD and are charged through Paynow.
export const PLANS = {
  single: { name: 'Single job listing (30 days)', amount: 20, credits: 1, managed: false },
  featured: { name: 'Featured listing (30 days, top of page)', amount: 35, credits: 1, featured: true, managed: false },
  bundle5: { name: '5 job listings', amount: 80, credits: 5, managed: false },
  managed: { name: 'Managed recruitment: Tigermax shortlists and runs interviews (per role)', amount: 150, credits: 1, managed: true },
} as const;
export type PlanKey = keyof typeof PLANS;

// Fees paid by job seekers. The offshore registration is non-refundable.
// Each one has its own payment page at /pay/<key>.
export const CANDIDATE_FEES = {
  offshore: {
    name: 'Offshore & online placement registration (non-refundable)', amount: 240, short: 'Offshore & online placement',
    blurb: 'We look into jobs outside Zimbabwe, verify they are legitimate, facilitate review by the Office of the President and Cabinet (OPC), and handle other logistics until you travel and start work. Additional agency fees may apply.',
    agree: 'I understand the US$240 registration fee is non-refundable and that additional agency fees may apply.',
    after: 'Your registration is confirmed. Our team will contact you about verified jobs outside Zimbabwe.',
  },
  cv_starter: {
    name: 'Winning CV (professionally written)', amount: 15, short: 'Winning CV',
    blurb: 'Start with a winning CV. Our team rewrites your CV in a clean, professional format that gets noticed by employers in Zimbabwe and abroad.',
    agree: 'I understand our team will contact me to collect my details and that the fee is for CV writing only.',
    after: 'Thank you. Our team will contact you within one working day on WhatsApp or email to start your CV. Make sure your current CV and phone number are saved on your dashboard.',
  },
  cv_revamp: {
    name: 'Know yourself + CV revamp', amount: 65, short: 'Know yourself + CV revamp',
    blurb: 'Do you ever feel like you are not enough for that opportunity? Get help getting to know yourself, your strengths and where you fit best, then we revamp your CV around your true self.',
    agree: 'I understand our team will book a session with me and then revamp my CV.',
    after: 'Thank you. Our team will contact you within one working day on WhatsApp or email to book your session. Make sure your current CV and phone number are saved on your dashboard.',
  },
} as const;
export type CandidateFeeKey = keyof typeof CANDIDATE_FEES;
