import { pgTable, text, boolean, timestamp, index } from "drizzle-orm/pg-core";

import { timestamps } from "./store";

/** Contact-form messages from the public site. */
export const message = pgTable(
  "message",
  {
    id: text("id")
      .primaryKey()
      .$defaultFn(() => crypto.randomUUID()),
    senderName: text("sender_name").notNull(),
    senderEmail: text("sender_email").notNull(),
    senderPhone: text("sender_phone"),
    subject: text("subject"),
    body: text("body").notNull(),
    isRead: boolean("is_read").notNull().default(false),
    emailedAt: timestamp("emailed_at"),
    ...timestamps,
  },
  (table) => [index("message_isRead_idx").on(table.isRead)],
);
