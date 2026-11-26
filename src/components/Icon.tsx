import {
  AlarmClock, AppWindow, Ban, BadgeCheck, BarChart3, Book, Bot, Bug, CheckCircle2, ClipboardList, Circle, CircleDot,
  Clock, Cloud, CreditCard, Diamond, Download, FileKey, FileText, Flame, Flower2, Folder, FlaskConical, Gem, Globe,
  Hash, Headphones, HelpCircle, Hourglass, Inbox, Infinity as InfinityIcon, KeyRound, Landmark, Laptop, Lock, LogOut,
  Mail, MessageSquare, Monitor, Moon, Package, PartyPopper, PauseCircle, PenLine, Pencil, Pin, Plus, Radio, Receipt,
  Rocket, Save, ScrollText, Search, Settings, Shield, ShieldCheck, SlidersHorizontal, Smartphone, Sparkles, Sun, Tag,
  Ticket, Trash2, TriangleAlert, Unlock, Upload, User, XCircle, Zap, CalendarDays,
  type LucideIcon,
} from 'lucide-react';

/** Semantic icon names used across the panel (single place to change an icon). */
const ICONS = {
  ok: CheckCircle2, error: XCircle, warn: TriangleAlert, pause: PauseCircle, ban: Ban, help: HelpCircle,
  package: Package, key: KeyRound, user: User, empty: Inbox, calendar: CalendarDays, rocket: Rocket, ticket: Ticket,
  magic: Sparkles, pending: Hourglass, tag: Tag, bolt: Zap, device: Laptop, forever: InfinityIcon, settings: Settings,
  message: MessageSquare, save: Save, chart: BarChart3, secret: Lock, bot: Bot, shield: Shield, shieldCheck: ShieldCheck,
  trial: FlaskConical, unlock: Unlock, note: FileText, mail: Mail, home: Landmark, brand: BadgeCheck, trash: Trash2,
  signal: Radio, sliders: SlidersHorizontal, monitor: Monitor, phone: Smartphone, plus: Plus, pin: Pin,
  list: ClipboardList, log: ScrollText, logout: LogOut, fire: Flame, party: PartyPopper, fileKey: FileKey,
  receipt: Receipt, globe: Globe, edit: Pencil, sign: PenLine, upload: Upload, download: Download, moon: Moon, sun: Sun,
  alarm: AlarmClock, book: Book, folder: Folder, search: Search, flower: Flower2, clock: Clock, gem: Gem, hash: Hash,
  cloud: Cloud, window: AppWindow, bug: Bug, card: CreditCard, dot: Circle, dotFill: CircleDot, diamond: Diamond,
  headphones: Headphones,
} satisfies Record<string, LucideIcon>;

export type IconName = keyof typeof ICONS;

/** Lucide icon that scales with the surrounding font size (like the emoji it replaces) and follows currentColor. */
export function Icon({ name, className = '', size = '1.15em' }: { name: IconName; className?: string; size?: string | number }) {
  const C = ICONS[name] ?? Circle;
  return <C size={size} strokeWidth={1.9} aria-hidden="true" className={`inline-block shrink-0 align-[-0.15em] ${className}`} />;
}
