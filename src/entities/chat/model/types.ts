export type ChatAuthorType = "cliente" | "socio";

export interface ChatMessage {
  id: string;
  authorType: ChatAuthorType;
  authorName: string;
  text: string;
  createdAt: string;
}
