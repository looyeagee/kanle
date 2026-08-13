export function siteTitleOf(profile?: { siteTitle?: string; nickname?: string } | null): string {
  return (profile?.siteTitle || profile?.nickname || "看了").trim() || "看了";
}

export function setDocumentTitle(title: string) {
  document.title = title;
}
