import { getDb } from "@/db";
import {
  deleteGithubAccount,
  findGithubAccountByUserId,
  type GithubAccount,
} from "@/server/models/github-account.model";

export interface ProfileData {
  githubAccount: GithubAccount | null;
}

export async function getProfileData(userId: string): Promise<ProfileData> {
  const db = getDb();
  const githubAccount = await findGithubAccountByUserId(db, userId);
  return { githubAccount };
}

export async function disconnectGithubAccount(userId: string): Promise<void> {
  const db = getDb();
  await deleteGithubAccount(db, userId);
}
