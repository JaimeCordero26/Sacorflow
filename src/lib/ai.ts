// Desglose de ideas con Cloudflare Workers AI (Llama, free-tier, sin API key
// externa). Toma la idea + comentarios y propone una lista de issues concretos.

const MODEL = "@cf/meta/llama-3.1-8b-instruct";

export interface IssueSugerido {
  titulo: string;
  cuerpo: string;
}

interface IdeaInput {
  titulo: string;
  descripcion?: string | null;
  comentarios: { autor: string; texto: string }[];
}

const SYSTEM = `Eres un asistente técnico de SacorTech. Recibes una idea de proyecto
de software y los comentarios de los socios. Tu tarea es desglosarla en tareas de
implementación concretas y accionables (issues de GitHub).
Responde EXCLUSIVAMENTE con un array JSON válido, sin texto adicional, con la forma:
[{"titulo":"...","cuerpo":"..."}]
Reglas: 5 a 10 items; titulo corto e imperativo (ej. "Configurar autenticación");
cuerpo con 1-3 frases de detalle o criterios de aceptación; todo en español.`;

// Extrae el primer array JSON del texto del modelo (tolera ruido alrededor).
function parseIssues(text: string): IssueSugerido[] {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end <= start) return [];
  try {
    const arr = JSON.parse(text.slice(start, end + 1));
    if (!Array.isArray(arr)) return [];
    return arr
      .filter((x) => x && typeof x.titulo === "string")
      .map((x) => ({
        titulo: String(x.titulo).slice(0, 200).trim(),
        cuerpo: typeof x.cuerpo === "string" ? x.cuerpo.trim() : "",
      }))
      .filter((x) => x.titulo.length > 0);
  } catch {
    return [];
  }
}

export async function desglosarIdea(
  env: CloudflareEnv,
  idea: IdeaInput,
): Promise<IssueSugerido[]> {
  const comentarios =
    idea.comentarios.length > 0
      ? idea.comentarios.map((c) => `- ${c.autor}: ${c.texto}`).join("\n")
      : "(sin comentarios)";

  const userMsg = `IDEA: ${idea.titulo}
DESCRIPCIÓN: ${idea.descripcion || "(sin descripción)"}
COMENTARIOS DE LOS SOCIOS:
${comentarios}`;

  const out = (await env.AI.run(MODEL, {
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: userMsg },
    ],
    max_tokens: 1024,
  })) as { response?: string };

  return parseIssues(out.response ?? "");
}
