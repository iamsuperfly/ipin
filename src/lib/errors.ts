export function writeErrorText(error: unknown) {
  if (!error) return "";
  if (typeof error === "object" && error !== null) {
    const rec = error as { shortMessage?: string; message?: string };
    return rec.shortMessage || rec.message || "Transaction failed";
  }
  return String(error);
}
