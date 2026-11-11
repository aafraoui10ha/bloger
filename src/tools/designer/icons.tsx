// Icon library for the Chart Designer (lucide, ISC licence). Icons render as inline
// SVG, so they stay sharp in every export format.
import {
  Activity, AlertTriangle, ArrowDown, ArrowRight, ArrowUp, ArrowUpRight, Award, Banknote, BarChart3, Bell, BookOpen, Briefcase, Building2, Calculator,
  Calendar, Camera, Car, CheckCircle2, Clock, Cloud, Code, Coins, Cpu, CreditCard, Crown, Database, DollarSign, Droplet, Euro, Eye, Factory, Flag, Flame,
  Gauge, Gem, Gift, Globe, GraduationCap, Handshake, Heart, HeartPulse, Home, Info, Laptop, Layers, Leaf, Lightbulb, LineChart, Lock, Mail, Map, MapPin,
  Medal, Megaphone, MessageCircle, Monitor, Music, Package, Palette, Percent, Phone, PieChart, PiggyBank, Plane, Play, Puzzle, Recycle, Rocket, Scale,
  Search, Server, Settings, Share2, Shield, ShoppingBag, ShoppingCart, Smartphone, Smile, Sparkles, Star, Stethoscope, Sun, Target, ThumbsUp, Timer,
  TrendingDown, TrendingUp, Trophy, Truck, User, UserCheck, Users, Wallet, Wifi, XCircle, Zap, type LucideIcon,
} from "lucide-react";

export const ICON_GROUPS: Record<string, Record<string, LucideIcon>> = {
  business: { "trending-up": TrendingUp, "trending-down": TrendingDown, "bar-chart": BarChart3, "pie-chart": PieChart, "line-chart": LineChart, target: Target, briefcase: Briefcase, building: Building2, factory: Factory, handshake: Handshake, gauge: Gauge, layers: Layers, award: Award, trophy: Trophy, medal: Medal, crown: Crown, rocket: Rocket, flag: Flag, puzzle: Puzzle },
  finance: { dollar: DollarSign, euro: Euro, coins: Coins, wallet: Wallet, "credit-card": CreditCard, "piggy-bank": PiggyBank, banknote: Banknote, percent: Percent, calculator: Calculator, scale: Scale, gem: Gem },
  people: { users: Users, user: User, "user-check": UserCheck, smile: Smile, heart: Heart, "thumbs-up": ThumbsUp, "graduation-cap": GraduationCap, "book-open": BookOpen, stethoscope: Stethoscope, "heart-pulse": HeartPulse, activity: Activity },
  tech: { cpu: Cpu, cloud: Cloud, database: Database, server: Server, smartphone: Smartphone, laptop: Laptop, monitor: Monitor, wifi: Wifi, code: Code, settings: Settings, lock: Lock, shield: Shield, zap: Zap, lightbulb: Lightbulb, sparkles: Sparkles, palette: Palette },
  commerce: { "shopping-cart": ShoppingCart, "shopping-bag": ShoppingBag, package: Package, truck: Truck, plane: Plane, car: Car, "map-pin": MapPin, map: Map, globe: Globe, home: Home, gift: Gift },
  communication: { mail: Mail, message: MessageCircle, phone: Phone, share: Share2, megaphone: Megaphone, bell: Bell, eye: Eye, search: Search, camera: Camera, music: Music, play: Play },
  nature: { leaf: Leaf, sun: Sun, droplet: Droplet, flame: Flame, recycle: Recycle },
  symbols: { star: Star, check: CheckCircle2, x: XCircle, alert: AlertTriangle, info: Info, "arrow-up": ArrowUp, "arrow-down": ArrowDown, "arrow-right": ArrowRight, "arrow-up-right": ArrowUpRight, calendar: Calendar, clock: Clock, timer: Timer },
};

export const ICONS: Record<string, LucideIcon> = Object.assign({}, ...Object.values(ICON_GROUPS));
export const ICON_NAMES = Object.keys(ICONS);

/** An icon drawn inside an SVG at the given box. */
export function SvgIcon({ name, x, y, size, color, strokeWidth = 2 }: { name: string; x: number; y: number; size: number; color: string; strokeWidth?: number }) {
  const Icon = ICONS[name] ?? Star;
  return <Icon x={x} y={y} width={size} height={size} color={color} strokeWidth={strokeWidth} aria-hidden="true" />;
}
