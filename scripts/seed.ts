/**
 * Seeds the two partner users + default project stages into D1.
 *
 * Credentials come from env vars (never hardcoded):
 *   SEED_USER1_NOMBRE / SEED_USER1_EMAIL / SEED_USER1_PASSWORD
 *   SEED_USER2_NOMBRE / SEED_USER2_EMAIL / SEED_USER2_PASSWORD
 *
 * Usage:
 *   pnpm seed              # applies to the LOCAL D1 (wrangler --local)
 *   pnpm seed -- --remote  # applies to the REMOTE (production) D1
 *
 * Values are read from process.env, falling back to a local .dev.vars file.
 */
import { execFileSync } from "node:child_process";
import { existsSync, readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";

const DB_NAME = "sacortech-db";

function loadDevVars() {
  if (!existsSync(".dev.vars")) return;
  for (const line of readFileSync(".dev.vars", "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (!m) continue;
    let [, k, v] = m;
    v = v.replace(/^["']|["']$/g, "");
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

function req(name: string): string {
  const v = process.env[name];
  if (!v) {
    console.error(`Falta la variable de entorno ${name}`);
    process.exit(1);
  }
  return v;
}

function sqlStr(s: string): string {
  return `'${s.replace(/'/g, "''")}'`;
}

async function main() {
  loadDevVars();
  const remote = process.argv.includes("--remote");

  const users = [
    {
      nombre: req("SEED_USER1_NOMBRE"),
      email: req("SEED_USER1_EMAIL").toLowerCase(),
      password: req("SEED_USER1_PASSWORD"),
    },
    {
      nombre: req("SEED_USER2_NOMBRE"),
      email: req("SEED_USER2_EMAIL").toLowerCase(),
      password: req("SEED_USER2_PASSWORD"),
    },
  ];

  const stmts: string[] = [];
  for (const u of users) {
    const hash = await bcrypt.hash(u.password, 10);
    stmts.push(
      `INSERT INTO usuarios (id, nombre, email, password_hash) VALUES (` +
        `${sqlStr(randomUUID())}, ${sqlStr(u.nombre)}, ${sqlStr(u.email)}, ${sqlStr(hash)}) ` +
        `ON CONFLICT(email) DO UPDATE SET nombre=excluded.nombre, password_hash=excluded.password_hash;`,
    );
  }

  const etapasDefault = ["Planeación", "Diseño", "Desarrollo", "Pruebas", "Entrega"];
  etapasDefault.forEach((nombre, i) => {
    stmts.push(
      `INSERT INTO etapas (id, nombre, orden) VALUES (${sqlStr(randomUUID())}, ${sqlStr(nombre)}, ${i});`,
    );
  });

  const dir = mkdtempSync(join(tmpdir(), "sacor-seed-"));
  const file = join(dir, "seed.sql");
  writeFileSync(file, stmts.join("\n"));

  const args = [
    "wrangler",
    "d1",
    "execute",
    DB_NAME,
    remote ? "--remote" : "--local",
    `--file=${file}`,
  ];
  console.log(`Aplicando seed a D1 (${remote ? "remote" : "local"})…`);
  execFileSync("npx", args, { stdio: "inherit" });
  console.log("Seed completado.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
