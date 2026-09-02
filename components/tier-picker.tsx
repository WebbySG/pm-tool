"use client";
import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { Check, Settings2, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { sortTiers, scopeLines, tierLevelLabel, tierFullLabel } from "@/lib/project-tiers";
import { errorMessage } from "@/lib/utils";
import { TierIconGlyph } from "./tier-badge";

/**
 * Admin control for labelling a project with a client package.
 *
 * A plain menu: every row writes immediately, so an outside click dismisses it
 * without a confirm (the Dismiss & Discard rule exempts menus that hold nothing
 * typed). The one wrinkle is that this menu opens from inside a project card,
 * which is a <Link> — so a dismissing click landing on a card is swallowed, or
 * closing the menu would also navigate the user into a project.
 *
 * Portalled to <body> for the usual reason: project cards are `overflow-hidden`
 * and dnd-kit puts a transform on the drag wrapper, either of which would clip
 * or re-anchor a positioned panel.
 */
export function TierPickerMenu({
  projectId,
  currentTierId,
  anchor,
  triggerRef,
  onClose,
}: {
  projectId: string;
  currentTierId: string | null;
  anchor: DOMRect;
  triggerRef: React.RefObject<HTMLElement | null>;
  onClose: () => void;
}) {
  const tiers = useStore((s) => s.tiers);
  const setProjectTier = useStore((s) => s.setProjectTier);
  const panelRef = useRef<HTMLDivElement>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  // Seeded from the rect captured at open time, then kept current by the
  // scroll/resize tracking below.
  const [rect, setRect] = useState<DOMRect>(anchor);

  useEffect(() => {
    function onPointerDown(e: MouseEvent) {
      const t = e.target as Node;
      if (panelRef.current?.contains(t) || triggerRef.current?.contains(t)) return;
      const el = t instanceof Element ? t : t.parentElement;
      // A click on a project card would navigate into it. preventDefault kills
      // only the anchor (next/link bails on defaultPrevented); React onClick
      // handlers still fire, so another card's tier button can hand over in one
      // click.
      if (el?.closest("[data-project-card]")) {
        const swallow = (ev: MouseEvent) => ev.preventDefault();
        document.addEventListener("click", swallow, { capture: true, once: true });
        // Safety net for a press with no click (drag, right-click) — otherwise
        // the listener would linger and eat an unrelated click later.
        window.setTimeout(() => document.removeEventListener("click", swallow, true), 400);
      }
      onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    function track() {
      const r = triggerRef.current?.getBoundingClientRect();
      if (r) setRect(r);
    }
    document.addEventListener("mousedown", onPointerDown, true);
    document.addEventListener("keydown", onKey);
    window.addEventListener("resize", track);
    window.addEventListener("scroll", track, true);
    return () => {
      document.removeEventListener("mousedown", onPointerDown, true);
      document.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", track);
      window.removeEventListener("scroll", track, true);
    };
  }, [onClose, triggerRef]);

  async function pick(tierId: string | null) {
    setBusyId(tierId ?? "none");
    setError(null);
    try {
      await setProjectTier(projectId, tierId);
      onClose();
    } catch (e) {
      setError(`Couldn't set the package: ${errorMessage(e)}`);
    } finally {
      setBusyId(null);
    }
  }

  const WIDTH = 250;
  const ordered = sortTiers(tiers);
  const spaceBelow = window.innerHeight - rect.bottom;
  const openUp = spaceBelow < 260 && rect.top > spaceBelow;
  const left = Math.min(Math.max(8, rect.left), window.innerWidth - WIDTH - 8);

  const panel = (
    <div
      ref={panelRef}
      className="fixed rounded-xl shadow-2xl overflow-hidden flex flex-col z-[160]"
      style={{
        left,
        ...(openUp ? { bottom: window.innerHeight - rect.top + 6 } : { top: rect.bottom + 6 }),
        width: WIDTH,
        background: "var(--bg-card, #0f1d2e)",
        border: "1px solid var(--border, #1c3248)",
        boxShadow: "0 16px 40px #00000080",
      }}
    >
      <div
        className="flex items-center justify-between px-3 py-2"
        style={{ borderBottom: "1px solid var(--border, #1c3248)" }}
      >
        <span className="text-xs font-bold" style={{ color: "var(--text, #cce4ff)" }}>Client package</span>
        <button onClick={onClose} className="hover:opacity-70" style={{ color: "var(--text-muted, #4a7090)" }}>
          <X size={13} />
        </button>
      </div>

      <div className="max-h-64 overflow-y-auto py-1">
        {ordered.length === 0 && (
          <p className="px-3 py-3 text-xs" style={{ color: "var(--text-muted, #4a7090)" }}>
            No packages defined yet.
          </p>
        )}
        {ordered.map((tier) => {
          const active = tier.id === currentTierId;
          return (
            <button
              key={tier.id}
              onClick={() => pick(active ? null : tier.id)}
              disabled={busyId !== null}
              className="w-full flex items-center gap-2 px-3 py-2 text-left transition-opacity hover:opacity-80 disabled:opacity-50"
              style={{ background: active ? tier.color + "12" : "transparent" }}
              title={active
                ? `Click to remove ${tierFullLabel(tier)}`
                : `Scope: ${scopeLines(tier.scope)[0] ?? "not recorded"}`}
            >
              {/* Icon only — the rung is spelled out in the row text below, and
                  a number chip here as well would say it twice in a 250px row. */}
              <span
                className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                style={{ background: tier.color + "22", color: tier.color }}
              >
                <TierIconGlyph icon={tier.icon} size={12} />
              </span>
              <span className="flex-1 min-w-0">
                <span className="block text-xs font-semibold truncate" style={{ color: "var(--text, #cce4ff)" }}>
                  {tierLevelLabel(tier) && (
                    <span style={{ color: tier.color }}>{tierLevelLabel(tier)} · </span>
                  )}
                  {tier.name}
                </span>
                {tier.scope.trim() && (
                  <span className="block text-[10px] truncate" style={{ color: "var(--text-muted, #4a7090)" }}>
                    {scopeLines(tier.scope)[0]}
                  </span>
                )}
              </span>
              {busyId === tier.id
                ? <span className="text-[10px] shrink-0" style={{ color: "var(--text-muted, #4a7090)" }}>…</span>
                : active && <Check size={13} style={{ color: tier.color }} className="shrink-0" />}
            </button>
          );
        })}

        {currentTierId && (
          <button
            onClick={() => pick(null)}
            disabled={busyId !== null}
            className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs hover:opacity-80 disabled:opacity-50"
            style={{ color: "var(--text-muted, #4a7090)" }}
          >
            {busyId === "none" ? "Removing…" : "— No package —"}
          </button>
        )}
      </div>

      {error && (
        <p className="px-3 py-2 text-[11px]" style={{ background: "#ef444412", color: "#fca5a5" }}>{error}</p>
      )}

      <Link
        href="/settings/packages"
        className="flex items-center gap-1.5 px-3 py-2 text-[11px] font-semibold hover:opacity-80"
        style={{ borderTop: "1px solid var(--border, #1c3248)", color: "var(--text-muted, #4a7090)" }}
      >
        <Settings2 size={11} /> Manage packages
      </Link>
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(panel, document.body);
}
