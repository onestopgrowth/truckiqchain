"use client";

// Simplified toast store inspired by shadcn/ui
import * as React from "react";

type Toast = {
  id: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

type ToastInput = {
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

type ToastActionElement = React.ReactElement;

const listeners: Array<(toasts: Toast[]) => void> = [];
let toasts: Toast[] = [];

function notify() {
  for (const l of listeners) l(toasts);
}

function coreToast(t: ToastInput) {
  const id = t.id ?? crypto.randomUUID();
  const next: Toast = {
    id,
    title: t.title,
    description: t.description,
    action: t.action,
    variant: t.variant,
  };
  // Replace any existing toast with same id to avoid duplicates
  toasts = [next, ...toasts.filter((x) => x.id !== id)];
  notify();
  return { id: next.id, dismiss: () => coreDismiss(next.id) };
}

function coreDismiss(id?: string) {
  if (!id) {
    toasts = [];
  } else {
    toasts = toasts.filter((t) => t.id !== id);
  }
  notify();
}

export function useToast() {
  const [state, setState] = React.useState<Toast[]>(toasts);

  React.useEffect(() => {
    listeners.push(setState);
    return () => {
      const idx = listeners.indexOf(setState);
      if (idx > -1) listeners.splice(idx, 1);
    };
  }, []);

  const toast = React.useCallback((t: ToastInput) => coreToast(t), []);
  const dismiss = React.useCallback((id?: string) => coreDismiss(id), []);

  return { toast, dismiss, toasts: state };
}

export type { Toast, ToastActionElement, ToastInput };
