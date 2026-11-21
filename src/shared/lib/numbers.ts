// Human-friendly document numbers: PREFIX-YYMMDD-XXXXX (e.g. MD-261108-7KQ4M).
// 5 chars from a 31-char unambiguous alphabet ≈ 28.6M combinations per day,
// so collisions are vanishingly rare; the DB unique constraint is the backstop.
const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

function randomCode(length: number): string {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  let out = "";
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export function documentNumber(prefix: string, date = new Date()): string {
  const yy = String(date.getUTCFullYear()).slice(-2);
  const mm = String(date.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(date.getUTCDate()).padStart(2, "0");
  return `${prefix}-${yy}${mm}${dd}-${randomCode(5)}`;
}

export const NUMBER_PREFIX = {
  sale: "MD",
  purchase: "PO",
  invoice: "INV",
  booking: "BK",
  workOrder: "WO",
} as const;
