import {
  Building2, Calculator, CalendarCheck, Coffee, Fingerprint, MessageCircle, ShieldCheck, Users, Wallet,
  type LucideIcon,
} from 'lucide-react';

type Node = { label: string; Icon: LucideIcon; tone: string };

// Clockwise from the top, same order as the design.
const NODES: Node[] = [
  { label: 'ERP', Icon: Building2, tone: '#7aa2ff' },
  { label: 'حساب‌یار', Icon: Calculator, tone: '#7aa2ff' },
  { label: 'پیمان', Icon: CalendarCheck, tone: '#8ea0ff' },
  { label: 'روند', Icon: Fingerprint, tone: '#a58bff' },
  { label: 'CRM', Icon: Users, tone: '#8ea0ff' },
  { label: 'منوتم', Icon: Coffee, tone: '#a58bff' },
  { label: 'مرزگارد', Icon: ShieldCheck, tone: '#b58bff' },
  { label: 'Payto', Icon: Wallet, tone: '#c08bff' },
  { label: 'هما', Icon: MessageCircle, tone: '#b58bff' },
];

const RADIUS = 38; // % of the square, node centers sit on this circle

/**
 * Product orbit: hub in the middle, products around it. Pure CSS (no client JS).
 * Put it BEFORE the text in the DOM so it comes first on mobile.
 */
export function Orbit({ hub = 'پشتوان' }: { hub?: string }) {
  return (
    <div
      className="orbit relative mx-auto aspect-square w-full max-w-[420px] overflow-hidden rounded-3xl"
      style={{ background: 'radial-gradient(circle at 50% 50%, #1b1f66 0%, #0d1038 55%, #080a25 100%)' }}
      role="img"
      aria-label={`${hub} و محصولات: ${NODES.map((n) => n.label).join('، ')}`}
    >
      {/* rings */}
      <div className="absolute inset-[11%] rounded-full border border-dashed border-white/10" />
      <div className="absolute inset-[24%] rounded-full border border-white/10" />

      {/* spokes + nodes rotate slowly; each node counter-rotates so labels stay upright */}
      <div className="orbit-spin absolute inset-0">
        {NODES.map(({ label, Icon, tone }, i) => {
          const a = ((-90 + i * (360 / NODES.length)) * Math.PI) / 180;
          const left = 50 + RADIUS * Math.cos(a);
          const top = 50 + RADIUS * Math.sin(a);
          return (
            <div key={label} className="absolute" style={{ left: `${left}%`, top: `${top}%`, width: 0, height: 0 }}>
              <div className="orbit-counter absolute -translate-x-1/2 -translate-y-[38%] flex flex-col items-center gap-1.5">
                <span
                  className="flex size-[3.4rem] sm:size-16 items-center justify-center rounded-2xl border backdrop-blur-sm"
                  style={{ borderColor: `${tone}66`, background: `${tone}1f`, color: tone }}
                >
                  <Icon className="size-6" strokeWidth={1.8} aria-hidden="true" />
                </span>
                <span className="text-[11px] font-semibold text-white/90 whitespace-nowrap">{label}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* hub */}
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="flex flex-col items-center gap-2 rounded-[1.75rem] border border-white/15 bg-[#2a2fb8]/60 px-7 py-5 shadow-[0_0_60px_rgba(70,80,255,0.45)] backdrop-blur">
          <span className="flex size-14 items-center justify-center rounded-2xl bg-[#3b44f0]">
            <svg viewBox="0 0 32 32" className="size-8" aria-hidden="true">
              <path d="M16 3 24 11 16 19 8 11Z" fill="#5eead4" />
              <rect x="6" y="21" width="20" height="3" rx="1.5" fill="#fff" />
              <rect x="10" y="26" width="12" height="3" rx="1.5" fill="#fff" opacity=".85" />
            </svg>
          </span>
          <span className="font-bold text-white">{hub}</span>
        </div>
      </div>
    </div>
  );
}
