// Formateo de fecha/hora compartido — evita reimplementar
// `new Date(x).toLocaleDateString(...)` con locale distinto en cada archivo.

const LOCALE = "es-MX";

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE);
}

export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleDateString(LOCALE, {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
  });
}
