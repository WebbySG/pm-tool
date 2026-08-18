"use client";
import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle } from "lucide-react";

/**
 * Shared "don't let a stray click bin my work" guard for every dismissable
 * dialog/popup in the app (user rule 2026-08-17).
 *
 * Rule: a dismiss gesture (backdrop click, ✕, Cancel, Escape) closes an
 * UNTOUCHED dialog straight away, but once the user has typed/changed/staged
 * something it asks first. Nothing is ever discarded silently — the same class
 * of bug as the disappearing comment draft (CLAUDE.md Known Recurring Mistake
 * #12) and the staged-receipt loss the expense form guarded by hand.
 *
 * Every caller routes ALL of its close paths through `requestClose` so the
 * gestures can't disagree, and renders `guard` (a portalled confirm) anywhere
 * inside its tree.
 */
export function useDiscardGuard({
  dirty,
  onClose,
  busy = false,
  title = "Discard unsaved changes?",
  message = "You've changed things here that haven't been saved yet. Closing now will lose them.",
  discardLabel = "Discard",
}: {
  /** Has the user typed/changed/staged anything worth protecting? */
  dirty: boolean;
  /** Actually close — only ever called once it's safe to. */
  onClose: () => void;
  /** A save/upload is in flight: swallow the dismiss entirely (closing mid-write is worse than either). */
  busy?: boolean;
  title?: string;
  message?: string;
  discardLabel?: string;
}) {
  const [asking, setAsking] = useState(false);

  const requestClose = useCallback(() => {
    if (busy) return;
    if (dirty) { setAsking(true); return; }
    onClose();
  }, [busy, dirty, onClose]);

  const keepEditing = useCallback(() => setAsking(false), []);
  const discard = useCallback(() => { setAsking(false); onClose(); }, [onClose]);

  // Derived, not synced through an effect: if the dialog stops being dirty
  // while the question is up (a save landed underneath it), there's nothing
  // left to ask about and it just goes away.
  const showConfirm = asking && dirty;

  const guard = showConfirm ? (
    <DiscardDialog
      title={title}
      message={message}
      discardLabel={discardLabel}
      onKeep={keepEditing}
      onDiscard={discard}
    />
  ) : null;

  return { requestClose, guard, asking: showConfirm, keepEditing, discard };
}

function DiscardDialog({
  title, message, discardLabel, onKeep, onDiscard,
}: {
  title: string;
  message: string;
  discardLabel: string;
  onKeep: () => void;
  onDiscard: () => void;
}) {
  useEffect(() => {
    // Capture phase, because the dialog underneath may have its own Escape
    // handler — the question must win, and answering it must not also close
    // the thing we're protecting.
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); onKeep(); }
    }
    document.addEventListener("keydown", onKey, true);
    return () => document.removeEventListener("keydown", onKey, true);
  }, [onKeep]);

  if (typeof document === "undefined") return null;

  // Portalled to <body> with its own full-screen backdrop: it must sit above
  // (and shield) the dialog it's asking about, whatever that dialog's z-index
  // or overflow is.
  return createPortal(
    <div
      className="fixed inset-0 z-[200] flex items-center justify-center p-4"
      style={{ background: "#000000b0" }}
      onClick={(e) => { e.stopPropagation(); onKeep(); }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      <div
        className="rounded-2xl w-full max-w-sm p-5 flex flex-col gap-3"
        style={{ background: "var(--bg-base)", border: "1px solid var(--border)", boxShadow: "0 16px 48px #00000060" }}
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          <AlertTriangle size={16} style={{ color: "#f59e0b" }} />
          <p className="font-semibold text-sm" style={{ color: "var(--text)" }}>{title}</p>
        </div>
        <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{message}</p>
        <div className="flex gap-2 justify-end pt-1">
          <button
            autoFocus
            onClick={onKeep}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "var(--bg-surface)", border: "1px solid var(--border)", color: "var(--text)" }}
          >
            Keep editing
          </button>
          <button
            onClick={onDiscard}
            className="px-3 py-1.5 rounded-lg text-xs font-semibold"
            style={{ background: "#ef4444", color: "#fff" }}
          >
            {discardLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
