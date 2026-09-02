"use client";
import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Sprout, TrendingUp, Rocket, Crown, Gem, Star, Zap, Flame, Target, Award,
  Trophy, Medal, Shield, Package, Briefcase, BarChart3,
} from "lucide-react";
import {
  type ProjectTier, DEFAULT_TIER_ICON, tierInitial, scopeLines,
  tierLevelLabel, tierFullLabel,
} from "@/lib/project-tiers";

/**
 * The lucide component behind each TIER_ICON_KEYS entry. The two lists must stay
 * in step — an icon key with no entry here falls back to the default rather than
 * rendering nothing, because the badge is the only thing telling staff which
 * package a client is on.
 */
const TIER_ICON_COMPONENTS: Record<string, typeof Star> = {
  Sprout, TrendingUp, Rocket, Crown, Gem, Star, Zap, Flame, Target, Award,
  Trophy, Medal, Shield, Package, Briefcase, BarChart3,
};

export function TierIconGlyph({ icon, size = 12, color }: { icon: string; size?: number; color?: string }) {
  const Icon = TIER_ICON_COMPONENTS[icon] ?? TIER_ICON_COMPONENTS[DEFAULT_TIER_ICON];
  return <Icon size={size} style={color ? { color } : undefined} />;
}

/**
 * The tier NUMBER — a filled chip carrying 1, 2 or 3.
 *
 * This is the mark the owner asked for: the ladder rung, readable beside a
 * project name without hovering anything. It leads the badge because the number
 * is the thing being looked up; the package icon that follows it is identity,
 * not rank.
 *
 * Renders nothing for an unranked package (level null) — a badge is not obliged
 * to be on the ladder.
 */
export function TierLevelMark({
  level, color, size = 14,
}: {
  level: number | null;
  color: string;
  size?: number;
}) {
  if (level == null) return null;
  return (
    <span
      className="inline-flex items-center justify-center rounded font-black shrink-0 leading-none"
      style={{
        width: size,
        height: size,
        background: color,
        // The chip is the tier colour at full strength, so the digit has to be
        // the card background rather than the colour used everywhere else.
        color: "var(--bg-card, #0f1d2e)",
        fontSize: size <= 13 ? 9 : 10,
      }}
      aria-hidden
    >
      {level}
    </span>
  );
}

/**
 * The tier badge: a small coloured chip beside a project.
 *
 * Hovering (or focusing) it shows the package scope — the point of the whole
 * feature is that staff can read the work scope off the board instead of
 * opening the quotation.
 *
 * The tooltip is PORTALLED to <body> and positioned from the trigger's
 * getBoundingClientRect(). It has to be: every surface that renders this badge
 * (project cards, the detail header, the dashboard list, global search) sits
 * inside an `overflow-hidden` card or a transformed drag wrapper, either of
 * which would clip an absolutely-positioned panel — the same trap the
 * credentials Manage menu and the staff-assign popup both hit.
 */
export function TierBadge({
  tier,
  showName = false,
  size = "sm",
  className = "",
}: {
  tier: ProjectTier;
  /** Show the package name next to the icon (headers), not just the icon. */
  showName?: boolean;
  size?: "sm" | "md";
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [rect, setRect] = useState<DOMRect | null>(null);

  const iconSize = size === "md" ? 13 : 11;
  const pad = showName ? (size === "md" ? "px-2 py-0.5" : "px-1.5 py-0.5") : (size === "md" ? "p-1" : "p-0.5");

  return (
    <>
      <span
        ref={ref}
        // A plain span, not a button: the badge is almost always rendered inside
        // the project card's <Link>, and nesting interactive elements there
        // breaks both the anchor and keyboard navigation.
        tabIndex={0}
        onMouseEnter={() => setRect(ref.current?.getBoundingClientRect() ?? null)}
        onMouseLeave={() => setRect(null)}
        onFocus={() => setRect(ref.current?.getBoundingClientRect() ?? null)}
        onBlur={() => setRect(null)}
        className={`inline-flex items-center gap-1 rounded-full shrink-0 ${pad} ${className}`}
        style={{
          background: tier.color + "22",
          border: `1px solid ${tier.color}55`,
          color: tier.color,
          outline: "none",
        }}
        aria-label={`Package: ${tierFullLabel(tier)}`}
      >
        <TierLevelMark level={tier.level} color={tier.color} size={size === "md" ? 15 : 13} />
        <TierIconGlyph icon={tier.icon} size={iconSize} />
        {showName && <span className="text-xs font-semibold">{tier.name}</span>}
      </span>
      {rect && <TierScopeTooltip tier={tier} anchor={rect} />}
    </>
  );
}

/**
 * The scope card. Flips above the badge when there is no room below, and is
 * clamped to the viewport horizontally so a badge near the right edge doesn't
 * push it off screen.
 */
function TierScopeTooltip({ tier, anchor }: { tier: ProjectTier; anchor: DOMRect }) {
  if (typeof document === "undefined") return null;

  const WIDTH = 288;
  const lines = scopeLines(tier.scope);
  // Rough height estimate, only used to decide flip — good enough, and cheaper
  // than a measure-then-reposition pass that would flicker.
  const estimated = 56 + (tier.level == null ? 0 : 14) + lines.length * 20;
  const below = anchor.bottom + 8;
  const flip = below + estimated > window.innerHeight && anchor.top > estimated + 16;
  const left = Math.min(Math.max(8, anchor.left - 8), window.innerWidth - WIDTH - 8);

  return createPortal(
    <div
      className="fixed z-[150] rounded-xl p-3 shadow-xl pointer-events-none"
      style={{
        top: flip ? anchor.top - estimated - 8 : below,
        left,
        width: WIDTH,
        background: "var(--bg-card, #0f1d2e)",
        border: `1px solid ${tier.color}55`,
        boxShadow: "0 12px 32px #00000070",
      }}
    >
      <div className="flex items-center gap-2 mb-2">
        <span
          className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: tier.color + "22", color: tier.color }}
        >
          <TierIconGlyph icon={tier.icon} size={13} />
        </span>
        <span className="min-w-0">
          {tierLevelLabel(tier) && (
            <span className="block text-[10px] font-bold uppercase tracking-wide"
              style={{ color: "var(--text-muted, #4a7090)" }}>
              {tierLevelLabel(tier)}
            </span>
          )}
          <span className="block text-sm font-bold" style={{ color: tier.color }}>{tier.name}</span>
        </span>
      </div>
      {lines.length === 0 ? (
        <p className="text-xs" style={{ color: "var(--text-muted, #4a7090)" }}>
          No scope recorded for this package yet.
        </p>
      ) : (
        <ul className="flex flex-col gap-1">
          {lines.map((line, i) => (
            <li key={i} className="text-xs leading-snug flex gap-1.5" style={{ color: "var(--text, #cce4ff)" }}>
              <span style={{ color: tier.color }}>•</span>
              <span>{line}</span>
            </li>
          ))}
        </ul>
      )}
    </div>,
    document.body,
  );
}

/**
 * The text fallback — used where an icon has no room to breathe (dense rows).
 * Same colour language as the badge so the two read as one thing.
 *
 * A ranked package shows its LEVEL here rather than its initials: in one
 * character, "2" says more than "G", and it is the label the owner uses out
 * loud. Unranked packages keep the initials.
 */
export function TierInitial({ tier }: { tier: ProjectTier }) {
  return (
    <span
      className="inline-flex items-center justify-center rounded-md text-[10px] font-bold shrink-0"
      style={{ width: 18, height: 18, background: tier.color + "22", color: tier.color }}
      title={tierFullLabel(tier)}
    >
      {tier.level ?? tierInitial(tier)}
    </span>
  );
}
