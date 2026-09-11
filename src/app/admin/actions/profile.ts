"use server";

import { revalidatePath } from "next/cache";
import { requireSession } from "@/lib/auth";
import { disconnectGithubAccount as disconnectGithubAccountService } from "@/server/services/profile.service";

export async function disconnectGithubAccountAction() {
  const session = await requireSession();
  await disconnectGithubAccountService(session.uid);
  revalidatePath("/admin/profile");
}
