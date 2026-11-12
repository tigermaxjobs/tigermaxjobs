// Edit prices here. Amounts are in USD and are charged through Paynow.
export const PLANS = {
  single: { name: 'Single job listing (30 days)', amount: 20, credits: 1, managed: false },
  featured: { name: 'Featured listing (30 days, top of page)', amount: 35, credits: 1, featured: true, managed: false },
  bundle5: { name: '5 job listings', amount: 80, credits: 5, managed: false },
  managed: { name: 'Managed recruitment: Tigermax shortlists and runs interviews (per role)', amount: 150, credits: 1, managed: true },
} as const;
export type PlanKey = keyof typeof PLANS;
