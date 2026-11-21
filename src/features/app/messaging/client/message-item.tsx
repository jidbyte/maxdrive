"use client";

import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { Mail, MailOpen, Phone, Reply } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { cn } from "@/shared/lib/utils";
import { markMessageRead } from "@/features/app/messaging/server/actions";

export function MessageItem({
  message: m,
}: {
  message: {
    id: string;
    senderName: string;
    senderEmail: string;
    senderPhone: string | null;
    subject: string | null;
    body: string;
    isRead: boolean;
    createdAt: string;
  };
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const toggle = (isRead: boolean) =>
    start(async () => {
      await markMessageRead(m.id, isRead);
      router.refresh();
    });

  return (
    <li
      className={cn(
        "rounded-xl border bg-card p-5 shadow-card transition-opacity",
        m.isRead ? "border-border" : "border-primary/40",
        pending && "opacity-60",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-bold text-ink">
            {!m.isRead && <span className="size-2 rounded-full bg-primary" aria-label="Unread" />}
            {m.subject || "(no subject)"}
          </p>
          <p className="text-sm text-neutral">
            {m.senderName} · {m.senderEmail}
            {m.senderPhone && ` · ${m.senderPhone}`}
          </p>
        </div>
        <time className="text-xs text-neutral">{new Date(m.createdAt).toLocaleString()}</time>
      </div>
      <p className="mt-3 text-sm whitespace-pre-line text-ink">{m.body}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button asChild size="sm">
          <a
            href={`mailto:${m.senderEmail}?subject=${encodeURIComponent(`Re: ${m.subject ?? "Your enquiry"}`)}`}
            onClick={() => !m.isRead && toggle(true)}
          >
            <Reply /> Reply
          </a>
        </Button>
        {m.senderPhone && (
          <Button asChild size="sm" variant="outline">
            <a href={`tel:${m.senderPhone}`}>
              <Phone /> Call
            </a>
          </Button>
        )}
        <Button size="sm" variant="ghost" onClick={() => toggle(!m.isRead)} disabled={pending}>
          {m.isRead ? <Mail /> : <MailOpen />} Mark as {m.isRead ? "unread" : "read"}
        </Button>
      </div>
    </li>
  );
}
