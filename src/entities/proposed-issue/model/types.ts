export type ProposalStatus = "propuesto" | "aceptado" | "descartado";

export interface ProposedIssue {
  id: string;
  title: string;
  body: string;
  status: ProposalStatus;
  githubIssueNumber: number | null;
  githubIssueUrl: string | null;
}
