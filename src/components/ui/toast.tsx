"use client";

import { ReactNode, useCallback, useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

type Toast = {
  id: number;
  text: string | ReactNode;
  measuredHeight?: number;
  timeout?: ReturnType<typeof setTimeout>;
  remaining?: number;
  start?: number;
  pause?: () => void;
  resume?: () => void;
  preserve?: boolean;
  action?: string;
  onAction?: () => void;
  onUndoAction?: () => void;
  type: "message" | "success" | "warning" | "error";
};

let root: ReturnType<typeof createRoot> | null = null;
let toastId = 0;

const toastStore = {
  toasts: [] as Toast[],
  listeners: new Set<() => void>(),

  add(
    text: string | ReactNode,
    type: "message" | "success" | "warning" | "error",
    preserve?: boolean,
    action?: string,
    onAction?: () => void,
    onUndoAction?: () => void
  ) {
    const id = toastId++;
    const toast: Toast = { id, text, preserve, action, onAction, onUndoAction, type };

    if (!toast.preserve) {
      toast.remaining = 3000;
      toast.start = Date.now();
      const close = () => {
        this.toasts = this.toasts.filter((t) => t.id !== id);
        this.notify();
      };
      toast.timeout = setTimeout(close, toast.remaining);
      toast.pause = () => {
        if (!toast.timeout) return;
        clearTimeout(toast.timeout);
        toast.timeout = undefined;
        toast.remaining! -= Date.now() - toast.start!;
      };
      toast.resume = () => {
        if (toast.timeout) return;
        toast.start = Date.now();
        toast.timeout = setTimeout(close, toast.remaining);
      };
    }

    this.toasts.push(toast);
    this.notify();
  },

  remove(id: number) {
    toastStore.toasts = toastStore.toasts.filter((t) => t.id !== id);
    toastStore.notify();
  },

  subscribe(listener: () => void) {
    toastStore.listeners.add(listener);
    return () => { toastStore.listeners.delete(listener); };
  },

  notify() {
    toastStore.listeners.forEach((fn) => fn());
  }
};

const typeStyles: Record<Toast["type"], { bg: string; text: string; bar: string }> = {
  success: { bg: "bg-[#FFC193]", text: "text-[#1f1f1f]", bar: "bg-[#FF3737]" },
  error:   { bg: "bg-[#FF8383]", text: "text-[#3b1313]", bar: "bg-[#FF3737]" },
  warning: { bg: "bg-[#FFEDCE]", text: "text-[#2b2b2b]", bar: "bg-[#FF8383]" },
  message: { bg: "bg-white", text: "text-[#2C2C2C]", bar: "bg-[#FFC193]" },
};

const ToastContainer = () => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [shownIds, setShownIds] = useState<number[]>([]);
  const [isHovered, setIsHovered] = useState(false);

  const measureRef = (toast: Toast) => (node: HTMLDivElement | null) => {
    if (node && toast.measuredHeight == null) {
      toast.measuredHeight = node.getBoundingClientRect().height;
      toastStore.notify();
    }
  };

  useEffect(() => {
    setToasts([...toastStore.toasts]);
    return toastStore.subscribe(() => setToasts([...toastStore.toasts]));
  }, []);

  useEffect(() => {
    const unseen = toasts.filter(t => !shownIds.includes(t.id)).map(t => t.id);
    if (unseen.length > 0) requestAnimationFrame(() => setShownIds(prev => [...prev, ...unseen]));
  }, [toasts]);

  const lastVisibleCount = 3;
  const lastVisibleStart = Math.max(0, toasts.length - lastVisibleCount);

  const getFinalTransform = (index: number, length: number) => {
    if (index === length - 1) return "none";
    const offset = length - 1 - index;
    let translateY = toasts[length - 1]?.measuredHeight || 63;
    for (let i = length - 1; i > index; i--) {
      translateY += isHovered ? (toasts[i - 1]?.measuredHeight || 63) + 10 : 20;
    }
    const z = -offset;
    const scale = isHovered ? 1 : 1 - 0.05 * offset;
    return `translate3d(0, calc(100% - ${translateY}px), ${z}px) scale(${scale})`;
  };

  const handleMouseEnter = () => { setIsHovered(true); toastStore.toasts.forEach(t => t.pause?.()); };
  const handleMouseLeave = () => { setIsHovered(false); toastStore.toasts.forEach(t => t.resume?.()); };

  const visibleToasts = toasts.slice(lastVisibleStart);
  const containerHeight = visibleToasts.reduce((acc, t) => acc + (t.measuredHeight ?? 72), 0);

  return (
    <div className="fixed bottom-6 right-6 z-9999 pointer-events-none w-100" style={{ height: containerHeight }}>
      <div
        className="relative pointer-events-auto w-full"
        style={{ height: containerHeight }}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {toasts.map((toast, index) => {
          const isVisible = index >= lastVisibleStart;
          const styles = typeStyles[toast.type];
          return (
            <div
              key={toast.id}
              ref={measureRef(toast)}
              className={[
                "absolute right-0 bottom-0 rounded-2xl overflow-hidden h-fit border border-[#FFC193]/70",
                styles.bg,
                isVisible ? "opacity-100" : "opacity-0",
                index < lastVisibleStart ? "pointer-events-none" : "",
              ].join(" ")}
              style={{
                width: 400,
                transition: "all .35s cubic-bezier(.25,.75,.6,.98)",
                transform: shownIds.includes(toast.id)
                  ? getFinalTransform(index, toasts.length)
                  : "translate3d(0, 100%, 150px) scale(1)",
              }}
            >
              {/* Accent bar */}
              <div className={`h-1 w-full ${styles.bar}`} />

              <div className={`flex items-start justify-between gap-4 p-4 ${styles.text}`}>
                <div className="flex-1 text-sm leading-snug font-medium">{toast.text}</div>
                <div className="flex items-center gap-2 shrink-0">
                  {toast.onUndoAction && (
                    <button
                      onClick={() => { toast.onUndoAction?.(); toastStore.remove(toast.id); }}
                      className={`text-xs font-bold px-2 py-1 rounded-lg underline hover:no-underline transition-all ${styles.text}`}
                    >
                      Undo
                    </button>
                  )}
                  {toast.action && (
                    <button
                      onClick={() => { toast.onAction?.(); toastStore.remove(toast.id); }}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg bg-primary-foreground/20 hover:bg-primary-foreground/30 transition-all ${styles.text}`}
                    >
                      {toast.action}
                    </button>
                  )}
                  <button
                    onClick={() => toastStore.remove(toast.id)}
                    className={`w-6 h-6 flex items-center justify-center rounded-full bg-primary-foreground/10 hover:bg-primary-foreground/25 transition-all text-sm font-bold ${styles.text}`}
                    aria-label="Close"
                  >
                    x
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const mountContainer = () => {
  if (root) return;
  const el = document.createElement("div");
  document.body.appendChild(el);
  root = createRoot(el);
  root.render(<ToastContainer />);
};

interface Message {
  text: string | ReactNode;
  preserve?: boolean;
  action?: string;
  onAction?: () => void;
  onUndoAction?: () => void;
}

export const useToasts = () => {
  return {
    message: useCallback(({ text, preserve, action, onAction, onUndoAction }: Message) => {
      mountContainer();
      toastStore.add(text, "message", preserve, action, onAction, onUndoAction);
    }, []),
    success: useCallback((text: string) => {
      mountContainer();
      toastStore.add(text, "success");
    }, []),
    warning: useCallback((text: string) => {
      mountContainer();
      toastStore.add(text, "warning");
    }, []),
    error: useCallback((text: string) => {
      mountContainer();
      toastStore.add(text, "error");
    }, []),
  };
};
