import type { Autor } from "./types";

export function Avatar({ autor, size = 20 }: { autor: Autor; size?: number }) {
  const px = { width: size, height: size };
  if (autor.avatar) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={autor.avatar}
        alt={autor.nombre}
        style={px}
        className="rounded-full ring-1 ring-white/20"
      />
    );
  }
  return (
    <span
      style={{ ...px, backgroundColor: `${autor.color}22`, color: autor.color, borderColor: `${autor.color}55` }}
      className="inline-flex items-center justify-center rounded-full border text-[10px] font-bold"
    >
      {autor.nombre.charAt(0).toUpperCase()}
    </span>
  );
}

export function AutorChip({ autor }: { autor: Autor }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <Avatar autor={autor} size={18} />
      <span style={{ color: autor.color }} className="text-xs font-medium">
        {autor.nombre}
      </span>
    </span>
  );
}
