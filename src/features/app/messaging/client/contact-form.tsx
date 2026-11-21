"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { FormField } from "@/shared/components/common/form-field";
import { useActionTransition } from "@/shared/hooks/use-action-transition";
import { createMessageSchema, type CreateMessageInput } from "@/features/app/messaging/server/schema";
import { createMessage } from "@/features/app/messaging/server/actions";

const EMPTY: CreateMessageInput = {
  senderName: "",
  senderEmail: "",
  senderPhone: "",
  subject: "",
  body: "",
  website: "",
};

export function ContactForm() {
  const [isPending, startTransition] = useActionTransition();
  const [serverError, setServerError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateMessageInput>({
    resolver: zodResolver(createMessageSchema),
    defaultValues: EMPTY,
  });

  const onSubmit = (values: CreateMessageInput) => {
    setServerError(null);
    startTransition(async () => {
      const result = await createMessage(values);
      if (!result.success) {
        setServerError(result.error);
        return;
      }
      setSent(true);
      reset(EMPTY);
    });
  };

  if (sent) {
    return (
      <div className="flex items-start gap-3 rounded-xl border border-success/30 bg-success/10 p-5 text-sm text-ink">
        <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-success" />
        <div>
          <p className="font-semibold">Message sent</p>
          <p className="text-neutral">Thanks — our team will get back to you shortly.</p>
          <Button variant="link" className="h-auto p-0" onClick={() => setSent(false)}>
            Send another message
          </Button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden className="absolute -left-[9999px] h-0 w-0 overflow-hidden">
        <label>
          Website <input tabIndex={-1} autoComplete="off" {...register("website")} />
        </label>
      </div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <FormField label="Your name" htmlFor="senderName" required error={errors.senderName?.message}>
          <Input id="senderName" autoComplete="name" {...register("senderName")} />
        </FormField>
        <FormField label="Email" htmlFor="senderEmail" required error={errors.senderEmail?.message}>
          <Input id="senderEmail" type="email" autoComplete="email" {...register("senderEmail")} />
        </FormField>
        <FormField label="Phone (optional)" htmlFor="senderPhone" error={errors.senderPhone?.message}>
          <Input id="senderPhone" type="tel" autoComplete="tel" {...register("senderPhone")} />
        </FormField>
        <FormField label="Subject" htmlFor="subject" error={errors.subject?.message}>
          <Input id="subject" placeholder="e.g. Part enquiry for 2015 Camry" {...register("subject")} />
        </FormField>
      </div>
      <FormField label="Message" htmlFor="body" required error={errors.body?.message}>
        <Textarea
          id="body"
          rows={5}
          placeholder="Tell us your vehicle (year, make, model) and what you need."
          {...register("body")}
        />
      </FormField>
      {serverError && <p className="text-sm text-danger">{serverError}</p>}
      <Button type="submit" size="lg" loading={isPending} className="w-full sm:w-auto">
        Send message
      </Button>
    </form>
  );
}
