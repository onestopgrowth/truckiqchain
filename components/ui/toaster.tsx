"use client";

import * as React from "react";
import {
  Toast,
  ToastAction,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "./toast";
import { useToast } from "./use-toast";

export function Toaster() {
  const { toasts } = useToast();
  const items = React.useMemo(
    () =>
      toasts.map(({ id, title, description, action, variant }) => (
        <Toast key={id} variant={variant}>
          <div className="grid gap-1">
            {title ? <ToastTitle>{title}</ToastTitle> : null}
            {description ? (
              <ToastDescription>{description}</ToastDescription>
            ) : null}
          </div>
          {action ? <ToastAction altText="action">{action}</ToastAction> : null}
          <ToastClose />
        </Toast>
      )),
    [toasts]
  );
  return (
    <ToastProvider swipeDirection="right">
      {items}
      <ToastViewport />
    </ToastProvider>
  );
}
