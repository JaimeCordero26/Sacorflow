"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";

// Overlay + panel para diálogos flotantes. Usa createPortal a document.body
// a propósito: si este árbol se renderiza dentro de un ancestro con
// backdrop-filter/filter/transform (ej. la clase ".card", que trae
// backdrop-blur-sm), ese ancestro se vuelve el containing block de
// "position: fixed" y el modal queda recortado/desplazado en vez de cubrir
// toda la pantalla.
export function Modal({
  onClose,
  maxWidthClassName = "max-w-lg",
  zIndexClassName = "z-50",
  children,
}: {
  onClose: () => void;
  maxWidthClassName?: string;
  zIndexClassName?: string;
  children: ReactNode;
}) {
  return createPortal(
    <div
      className={`fixed inset-0 ${zIndexClassName} flex items-end justify-center bg-black/70 p-0 backdrop-blur-sm sm:items-center sm:p-4`}
      onClick={onClose}
    >
      <div
        className={`max-h-[85vh] w-full ${maxWidthClassName} overflow-y-auto rounded-t-2xl border border-white/10 bg-ink-900 p-5 sm:rounded-2xl`}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>,
    document.body,
  );
}
