import { Mail } from "lucide-react";

import { requireStaffPage } from "@/shared/authz/session";
import { PageHeader, PageTitle } from "@/shared/components/common/page-header";
import { listMessages } from "@/features/app/messaging/server/actions";
import { MessageItem } from "@/features/app/messaging/client/message-item";

export const metadata = { title: "Messages" };

export default async function MessagesPage() {
  await requireStaffPage();
  const messages = await listMessages();
  const unread = messages.filter((m) => !m.isRead).length;

  return (
    <div className="space-y-6">
      <PageHeader>
        <PageTitle icon={Mail} description={`${unread} unread · enquiries from the website contact form`}>
          Messages
        </PageTitle>
      </PageHeader>
      {messages.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-6 py-16 text-center text-neutral">
          No messages yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <MessageItem
              key={m.id}
              message={{
                id: m.id,
                senderName: m.senderName,
                senderEmail: m.senderEmail,
                senderPhone: m.senderPhone,
                subject: m.subject,
                body: m.body,
                isRead: m.isRead,
                createdAt: m.createdAt.toISOString(),
              }}
            />
          ))}
        </ul>
      )}
    </div>
  );
}
