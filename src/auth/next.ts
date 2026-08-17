/**
 * Chỉ chấp nhận "next" path bắt đầu bằng "/" (internal route),
 * không nhận scheme, không nhận `//host` (open-redirect guard).
 */
export function safeResolveNext(next: string | undefined | null): string | null {
  if (!next) return null;
  const trimmed = next.trim();
  if (!trimmed) return null;
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) return trimmed;
  return null;
}
