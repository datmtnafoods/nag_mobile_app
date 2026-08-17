export type ActivationParams = {
  code: string;
  sr: string;
  t?: string;
};

/**
 * Parse deeplink hoặc URL từ QR code thành ActivationParams.
 *
 * Hỗ trợ:
 *  - `nag://activation?code=LOT1&sr=SR1&t=HMAC`
 *  - `https://link.nagreen.vn/activation?code=LOT1&sr=SR1&t=HMAC`
 *  - Chuỗi query thuần: `code=LOT1&sr=SR1&t=HMAC`
 *
 * Trả về null nếu thiếu `code`/`sr` hoặc input không phải dạng deeplink kích hoạt
 * (kể cả khi chứa `%` không hợp lệ — sẽ được xem là mã không hợp lệ, không crash).
 */
export function parseActivationUrl(raw: string): ActivationParams | null {
  if (!raw) return null;
  try {
    const query = extractQuery(raw);
    if (!query) return null;
    const params = parseQuery(query);
    const code = params.code?.trim();
    const sr = params.sr?.trim();
    if (!code || !sr) return null;
    const t = params.t?.trim();
    return { code, sr, ...(t ? { t } : {}) };
  } catch {
    return null;
  }
}

function extractQuery(raw: string): string | null {
  const trimmed = raw.trim();
  const qIdx = trimmed.indexOf('?');
  if (qIdx >= 0) return trimmed.slice(qIdx + 1);
  if (trimmed.includes('=')) return trimmed;
  return null;
}

function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}

function parseQuery(query: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const pair of query.split('&')) {
    if (!pair) continue;
    const [rawKey, ...rest] = pair.split('=');
    const key = safeDecode(rawKey ?? '');
    const value = safeDecode(rest.join('='));
    if (key && value !== null) out[key] = value;
  }
  return out;
}
