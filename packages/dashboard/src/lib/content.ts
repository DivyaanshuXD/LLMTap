// Extract text content from message content (string or array format)
export function getTextContent(
  content: unknown
): string {
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .filter((p: { type?: string }) => p.type === "text")
      .map((p: { text?: string }) => p.text ?? "")
      .join("\n");
  }
  return "";
}
