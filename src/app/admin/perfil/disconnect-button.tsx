"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { desconectarGithub } from "../actions";

export function DisconnectButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          await desconectarGithub();
          router.refresh();
        })
      }
      disabled={pending}
      className="btn-danger"
    >
      {pending ? "…" : "Desconectar"}
    </button>
  );
}
