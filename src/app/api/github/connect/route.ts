import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Compatibilidad: el login es ahora "Entrar con GitHub".
export function GET(req: NextRequest) {
  return NextResponse.redirect(new URL("/api/auth/github", req.url));
}
