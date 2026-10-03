export type I18nTree = Record<string, unknown>;

export function lookupKey(doc: I18nTree, path: string): unknown {
  let cur: unknown = doc;
  for (const part of path.split(".")) {
    if (cur === null || typeof cur !== "object") return undefined;
    cur = (cur as I18nTree)[part];
  }
  return cur;
}

export function translatePath(
  doc: I18nTree,
  path: string,
  vars?: Record<string, string | number>,
): string | undefined {
  const value = lookupKey(doc, path);
  if (typeof value !== "string") return undefined;
  if (!vars) return value;
  return value.replace(/\{\{(\w+)\}\}/g, (match, name: string) =>
    name in vars ? String(vars[name]) : match,
  );
}