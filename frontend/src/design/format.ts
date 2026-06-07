/**
 * Formate une date ISO yyyy-MM-dd en format français dd/mm/yyyy.
 * Renvoie '—' si la chaîne est nulle ou non parseable.
 */
export function formatDate(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(iso);
  if (!m) return iso;
  return `${m[3]}/${m[2]}/${m[1]}`;
}

/**
 * Renvoie la date la plus récente d'une liste de dates ISO, formatée FR.
 */
export function formatLatestDate(isoDates: (string | null | undefined)[]): string {
  const valid = isoDates.filter((d): d is string => !!d);
  if (valid.length === 0) return '—';
  const max = valid.reduce((a, b) => (a > b ? a : b));
  return formatDate(max);
}

/**
 * Formate un LocalDateTime ISO (yyyy-MM-ddTHH:mm:ss) en convention française
 * `dd/mm/yyyy à HHhmm`. Fallback sur formatDate si la chaîne n'a pas d'heure.
 */
export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return '—';
  const m = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return formatDate(iso);
  return `${m[3]}/${m[2]}/${m[1]} à ${m[4]}h${m[5]}`;
}
