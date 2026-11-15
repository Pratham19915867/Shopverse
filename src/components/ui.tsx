"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { ArrowUpRight, LoaderCircle, ShoppingBag, Sparkles, X } from "lucide-react";

export function Brand({ light = false }: { light?: boolean }) {
  return <div className={`brand ${light ? "brand-light" : ""}`}><span className="brand-mark"><ShoppingBag size={23} strokeWidth={1.8} /><Sparkles className="brand-sparkle" size={11} /></span><span>shopverse<span className="brand-dot">.</span></span></div>;
}

export function Dialog({ children, title, onClose, className = "" }: { children: ReactNode; title: string; onClose: () => void; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement;
    const old = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const timer = setTimeout(() => ref.current?.focus(), 50);
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeRef.current();
      if (event.key !== "Tab" || !ref.current) return;
      const nodes = Array.from(ref.current.querySelectorAll<HTMLElement>('button:not([disabled]), a[href], input:not([disabled]), select, textarea, [tabindex="0"]')).filter((node) => node.offsetParent !== null);
      const first = nodes[0];
      const last = nodes[nodes.length - 1];
      if (event.shiftKey && (document.activeElement === first || document.activeElement === ref.current)) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && (document.activeElement === last || document.activeElement === ref.current)) { event.preventDefault(); first?.focus(); }
    };
    document.addEventListener("keydown", handleKey);
    return () => { clearTimeout(timer); document.body.style.overflow = old; document.removeEventListener("keydown", handleKey); previous?.focus(); };
  }, []);
  return <div className={`dialog-overlay ${className.includes("drawer") ? "drawer-overlay" : ""}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><div ref={ref} className={`dialog ${className}`} role="dialog" aria-modal="true" aria-label={title} tabIndex={-1}><button className="dialog-close icon-button" aria-label="Close dialog" onClick={onClose}><X size={20} /></button>{children}</div></div>;
}

export function Loading({ label = "Just a moment…" }: { label?: string }) { return <span className="loading-inline"><LoaderCircle size={17} className="spin" />{label}</span>; }

export function EmptyState({ icon, title, text, action, onAction }: { icon: ReactNode; title: string; text: string; action?: string; onAction?: () => void }) {
  return <div className="empty-state"><div className="empty-icon">{icon}</div><h3>{title}</h3><p>{text}</p>{action && <button className="primary-button" onClick={onAction}>{action}<ArrowUpRight size={17} /></button>}</div>;
}

export async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...options, headers: { "Content-Type": "application/json", ...options?.headers } });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || "Something went wrong. Please try again.");
  return data as T;
}
