export function circleReturn(search: string, hash: string) {
  const query = new URLSearchParams(search);
  const fragment = new URLSearchParams(hash.replace(/^#/, ""));
  if (query.get("error") || fragment.get("error")) return "error";
  if (query.get("code") || fragment.get("code")) return "code";
  return "";
}
