"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectGithubAccountAction } from "@/app/admin/actions/profile";

export function DisconnectGithubAccountButton() {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <button
      onClick={() =>
        start(async () => {
          await disconnectGithubAccountAction();
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
