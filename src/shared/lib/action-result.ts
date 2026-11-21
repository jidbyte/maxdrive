export type ActionResult<T = undefined> =
  | { success: true; data: T }
  | { success: false; error: string };

export function ok(): ActionResult<undefined>;
export function ok<T>(data: T): ActionResult<T>;
export function ok<T>(data?: T): ActionResult<T | undefined> {
  return { success: true, data };
}

export function fail(error: string): { success: false; error: string } {
  return { success: false, error };
}

/** First Zod issue as a user-facing message. */
export function zodMessage(error: { issues: Array<{ message: string }> }): string {
  return error.issues[0]?.message ?? "Invalid input.";
}
