import { NextResponse } from 'next/server';
import { paynowForOrder } from '@/lib/assessments/pay';

export const dynamic = 'force-dynamic';

// Payment link for an assessment order (sittings, packs, certificates, employer group packs). Printed on invoices.
export async function GET(req: Request, { params }: { params: { ref: string } }) {
  const to = await paynowForOrder(params.ref);
  return NextResponse.redirect(to.startsWith('http') ? to : new URL(to, req.url));
}
