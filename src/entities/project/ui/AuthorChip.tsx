import type { Author } from "../model/types";

export function AuthorAvatar({ author, size = 20 }: { author: Author; size?: number }) {
  const px = { width: size, height: size };
  if (author.avatarUrl) {
    // eslint-disable-next-line @next/next/no-img-element
    return (
      <img
        src={author.avatarUrl}
        alt={author.name}
        style={px}
        className="rounded-full ring-1 ring-white/20"
      />
    );
  }
  return (
    <span
      style={{ ...px, backgroundColor: `${author.color}22`, color: author.color, borderColor: `${author.color}55` }}
      className="inline-flex items-center justify-center rounded-full border text-[10px] font-bold"
    >
      {author.name.charAt(0).toUpperCase()}
    </span>
  );
}

export function AuthorChip({ author }: { author: Author }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <AuthorAvatar author={author} size={18} />
      <span style={{ color: author.color }} className="text-xs font-medium">
        {author.name}
      </span>
    </span>
  );
}
