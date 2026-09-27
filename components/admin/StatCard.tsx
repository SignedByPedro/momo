export default function StatCard({ label, value, note }: { label: string; value: number | string; note?: string }) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-[#151515] p-5">
      <p className="text-xs uppercase tracking-[0.14em] text-white/35">{label}</p>
      <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      {note && <p className="mt-2 text-xs text-white/35">{note}</p>}
    </div>
  );
}
