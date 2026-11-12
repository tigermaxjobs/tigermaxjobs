import { redirect } from 'next/navigation';
import { currentUser } from '@/lib/supabase';
import { startPayment } from '@/app/actions';
import { PLANS } from '@/lib/plans';

export const dynamic = 'force-dynamic';

export default async function Billing({ searchParams }: { searchParams: Record<string, string> }) {
  const { sb, user } = await currentUser();
  if (!user) redirect('/login?as=employer');
  const { data: e } = await sb.from('employers').select('id').eq('owner_id', user.id).maybeSingle();
  const { data: pays } = e ? await sb.from('payments').select('*').eq('employer_id', e.id).order('created_at', { ascending: false }) : { data: [] as any[] };
  return (
    <>
      {searchParams.need && <p className="notice">Your job is saved as a draft. Buy a listing to publish it.</p>}
      {searchParams.done && <p className="notice">Thank you. Your listing credit is added as soon as Paynow confirms the payment.</p>}
      {searchParams.error && <p className="notice">{searchParams.error}</p>}
      <h1>Listings and recruitment services</h1>
      <div className="grid2">
        {Object.entries(PLANS).map(([k, p]) => (
          <form key={k} action={startPayment} className="card stack">
            <input type="hidden" name="plan" value={k} />
            <h3 style={{ margin: 0 }}>{p.name}</h3>
            <div style={{ fontSize: 26, fontWeight: 700 }}>US${p.amount}</div>
            <button className="gold">Pay with Paynow</button>
            <span className="muted">EcoCash, OneMoney, Visa/Mastercard</span>
          </form>
        ))}
      </div>
      <h2>Payment history</h2>
      <div className="card"><table><tbody>
        {(pays || []).map((p: any) => <tr key={p.id}><td>{p.reference}</td><td>{p.plan}</td><td>US${p.amount}</td><td>{p.status}</td></tr>)}
        {!pays?.length && <tr><td className="muted">No payments yet.</td></tr>}
      </tbody></table></div>
    </>
  );
}
