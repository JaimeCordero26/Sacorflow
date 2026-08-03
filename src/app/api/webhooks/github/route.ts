import { NextRequest, NextResponse } from "next/server";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { eq } from "drizzle-orm";
import { getDb } from "@/db";
import { eventosProgreso, proyectos } from "@/db/schema";
import { newId } from "@/lib/ids";
import { computeProgress, verifyWebhookSignature } from "@/lib/github";

export const dynamic = "force-dynamic";

// Turns a raw GitHub event into a client-friendly, jargon-free description.
function friendlyDescription(event: string, payload: any): string | null {
  switch (event) {
    case "issues": {
      const action = payload.action;
      if (action === "closed") return "Se completó una tarea del proyecto.";
      if (action === "opened") return "Se agregó una nueva tarea al plan de trabajo.";
      return null;
    }
    case "milestone": {
      const action = payload.action;
      const title = payload.milestone?.title ?? "hito";
      if (action === "closed") return `Se completó una etapa importante: ${title}.`;
      if (action === "created") return `Se definió una nueva etapa: ${title}.`;
      if (action === "updated") return `Se actualizó la planificación de: ${title}.`;
      return null;
    }
    case "push":
      return "El equipo publicó nuevos avances en el desarrollo.";
    default:
      return null;
  }
}

export async function POST(req: NextRequest) {
  const { env } = getCloudflareContext();
  const secret = env.GITHUB_WEBHOOK_SECRET;
  const raw = await req.text();
  const signature = req.headers.get("x-hub-signature-256");
  const event = req.headers.get("x-github-event") ?? "";

  if (!secret || !(await verifyWebhookSignature(secret, raw, signature))) {
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: any;
  try {
    payload = JSON.parse(raw);
  } catch {
    return NextResponse.json({ error: "bad payload" }, { status: 400 });
  }

  const fullName: string | undefined = payload.repository?.full_name;
  if (!fullName) return NextResponse.json({ ok: true, note: "no repo" });

  const db = getDb();
  const linked = await db
    .select()
    .from(proyectos)
    .where(eq(proyectos.repoGithub, fullName))
    .all();

  if (linked.length === 0) {
    return NextResponse.json({ ok: true, note: "no linked project" });
  }

  const desc = friendlyDescription(event, payload);

  for (const proj of linked) {
    let pct = proj.progresoPct;

    // Recompute progress on events that can change issue counts.
    if ((event === "issues" || event === "milestone") && proj.installationId) {
      try {
        const result = await computeProgress(env, {
          installationId: proj.installationId,
          repo: fullName,
          milestoneId: proj.milestoneId,
        });
        pct = result.pct;
        await db
          .update(proyectos)
          .set({ progresoPct: pct })
          .where(eq(proyectos.id, proj.id));
      } catch (e) {
        console.error("[webhook] progress compute failed", e);
      }
    }

    if (desc) {
      await db.insert(eventosProgreso).values({
        id: newId(),
        proyectoId: proj.id,
        tipo: event,
        descripcion: desc,
        progresoPct: pct,
      });
    }
  }

  return NextResponse.json({ ok: true, updated: linked.length });
}
