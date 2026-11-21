"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowLeft, ArrowRight, CalendarDays, Car, Check, Clock, Loader2, User, Wrench } from "lucide-react";
import toast from "react-hot-toast";

import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Textarea } from "@/shared/components/ui/textarea";
import { FormField } from "@/shared/components/common/form-field";
import { Message } from "@/shared/components/common/message";
import { formatPrice } from "@/shared/utils/currency";
import { cn } from "@/shared/lib/utils";
import { CategoryIcon } from "@/features/storefront/ui/category-icon";
import type { DayAvailability } from "@/features/workshop/server/availability";
import { bookService, createStaffBooking, getAvailableSlots } from "@/features/workshop/server/actions";

export type WizardService = {
  id: string;
  name: string;
  summary: string | null;
  category: string | null;
  icon: string | null;
  durationMinutes: number;
  basePrice: number;
  priceIsFrom: boolean;
};
export type WizardDay = { date: string; weekday: string; day: string; month: string; closed: boolean };
export type WizardMake = { id: string; name: string; models: { id: string; name: string }[] };

const STEPS = [
  { key: "services", label: "Services", icon: Wrench },
  { key: "vehicle", label: "Vehicle", icon: Car },
  { key: "time", label: "Date & time", icon: CalendarDays },
  { key: "contact", label: "Your details", icon: User },
] as const;

const OTHER = "__other__";
const selectClass =
  "h-12 w-full rounded-[14px] border border-input bg-surface px-4 text-base text-ink outline-none focus-visible:border-primary focus-visible:ring-[3px] focus-visible:ring-primary/20 disabled:opacity-50 sm:text-sm";

export function BookingWizard({
  services,
  makes,
  days,
  currency,
  initialServiceIds = [],
  prefill,
  mode = "customer",
}: {
  services: WizardService[];
  makes: WizardMake[];
  days: WizardDay[];
  currency: string;
  initialServiceIds?: string[];
  prefill?: { name?: string; phone?: string; email?: string };
  mode?: "customer" | "staff";
}) {
  const router = useRouter();
  const [step, setStep] = useState(initialServiceIds.length ? 1 : 0);
  const [serviceIds, setServiceIds] = useState<string[]>(initialServiceIds);

  const [makeId, setMakeId] = useState("");
  const [modelId, setModelId] = useState("");
  const [makeName, setMakeName] = useState("");
  const [modelName, setModelName] = useState("");
  const [year, setYear] = useState("");
  const [plate, setPlate] = useState("");
  const [mileage, setMileage] = useState("");

  const [date, setDate] = useState<string | null>(null);
  const [availability, setAvailability] = useState<DayAvailability | null>(null);
  const [start, setStart] = useState<string | null>(null);
  const [loadingSlots, startSlots] = useTransition();

  const [name, setName] = useState(prefill?.name ?? "");
  const [phone, setPhone] = useState(prefill?.phone ?? "");
  const [email, setEmail] = useState(prefill?.email ?? "");
  const [notes, setNotes] = useState("");
  const [source, setSource] = useState<"phone" | "walk_in">("phone");
  const [error, setError] = useState<string | null>(null);
  const [submitting, startSubmit] = useTransition();

  const chosen = services.filter((s) => serviceIds.includes(s.id));
  const duration = chosen.reduce((s, x) => s + x.durationMinutes, 0);
  const estimate = chosen.reduce((s, x) => s + x.basePrice, 0);
  const anyFrom = chosen.some((s) => s.priceIsFrom);
  const make = makes.find((m) => m.id === makeId);
  const vehicleText = [year, makeId === OTHER || !make ? makeName : make.name, modelId && modelId !== OTHER ? make?.models.find((m) => m.id === modelId)?.name : modelName]
    .filter(Boolean)
    .join(" ");
  const slotTime = availability?.slots.find((s) => s.start === start)?.time;
  const dayInfo = days.find((d) => d.date === date);

  function loadDate(d: string, ids = serviceIds) {
    setDate(d);
    setStart(null);
    setAvailability(null);
    startSlots(async () => setAvailability(await getAvailableSlots(d, ids, mode === "staff")));
  }

  function toggleService(id: string) {
    setServiceIds((cur) => (cur.includes(id) ? cur.filter((x) => x !== id) : [...cur, id]));
    // Duration changed → previously picked slot may not fit.
    setDate(null);
    setAvailability(null);
    setStart(null);
  }

  function validate(i: number): string | null {
    if (i === 0 && serviceIds.length === 0) return "Choose at least one service.";
    if (i === 1) {
      const mk = makeId === OTHER || !makeId ? makeName.trim() : make?.name;
      const md = modelId === OTHER || !modelId ? modelName.trim() : "ok";
      if (!mk) return "Tell us your vehicle's make.";
      if (!md) return "Tell us your vehicle's model.";
    }
    if (i === 2 && !start) return "Pick a date and time.";
    return null;
  }

  function next() {
    const e = validate(step);
    if (e) return toast.error(e);
    const to = step + 1;
    setStep(to);
    if (to === 2 && !date) {
      const first = days.find((d) => !d.closed);
      if (first) loadDate(first.date);
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function submit() {
    setError(null);
    for (let i = 0; i < 3; i++) {
      const e = validate(i);
      if (e) {
        setStep(i);
        return setError(e);
      }
    }
    const makeLabel = makeId && makeId !== OTHER ? make!.name : makeName.trim();
    const modelLabel = modelId && modelId !== OTHER ? make?.models.find((m) => m.id === modelId)?.name ?? "" : modelName.trim();
    const payload = {
      serviceIds,
      vehicle: {
        makeId: makeId && makeId !== OTHER ? makeId : "",
        modelId: modelId && modelId !== OTHER ? modelId : "",
        makeName: makeLabel,
        modelName: modelLabel,
        year: year ? Number(year) : null,
        plateNumber: plate.trim(),
        mileage: mileage ? Number(mileage.replace(/\D/g, "")) : null,
      },
      start: start!,
      name,
      phone,
      email,
      notes,
    };
    startSubmit(async () => {
      if (mode === "staff") {
        const r = await createStaffBooking(payload, source);
        if (!r.success) return setError(r.error);
        toast.success("Booking created");
        router.push(`/admin/bookings/${r.data.id}`);
        router.refresh();
      } else {
        const r = await bookService(payload);
        if (!r.success) {
          setError(r.error);
          if (r.error.includes("just taken") && date) loadDate(date);
          return;
        }
        router.push(r.data.url);
      }
    });
  }

  const years = Array.from({ length: new Date().getFullYear() + 2 - 1985 }, (_, i) => new Date().getFullYear() + 1 - i);

  return (
    <div className="grid gap-8 pb-28 lg:grid-cols-[1fr_340px] lg:items-start lg:pb-0">
      <div className="min-w-0">
        {/* Stepper */}
        <ol className="mb-8 grid grid-cols-4 gap-2">
          {STEPS.map((s, i) => (
            <li key={s.key}>
              <button
                type="button"
                disabled={i > step}
                onClick={() => setStep(i)}
                className="group flex w-full flex-col gap-2 text-left disabled:cursor-default"
              >
                <span className={cn("h-1.5 rounded-full transition-colors", i <= step ? "bg-primary" : "bg-surface-2")} />
                <span className={cn("flex items-center gap-1.5 text-xs font-semibold sm:text-sm", i === step ? "text-ink" : i < step ? "text-primary" : "text-neutral")}>
                  {i < step ? <Check className="size-3.5" /> : <s.icon className="hidden size-4 sm:inline" />}
                  {s.label}
                </span>
              </button>
            </li>
          ))}
        </ol>

        {/* Step 1 — services */}
        {step === 0 && (
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">What does your vehicle need?</h2>
            <p className="mt-1 mb-6 text-neutral">Choose one or more services. You can add details in the last step.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              {services.map((s) => {
                const on = serviceIds.includes(s.id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleService(s.id)}
                    className={cn(
                      "flex gap-4 rounded-xl border p-4 text-left transition-colors",
                      on ? "border-primary bg-primary-soft" : "border-border bg-card hover:border-primary/40",
                    )}
                  >
                    <span className={cn("grid size-11 shrink-0 place-items-center rounded-full", on ? "bg-primary text-primary-foreground" : "bg-primary-soft text-primary")}>
                      {on ? <Check className="size-5" /> : <CategoryIcon name={s.icon} className="size-5" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-bold text-ink">{s.name}</span>
                      {s.summary && <span className="mt-0.5 line-clamp-2 block text-sm text-neutral">{s.summary}</span>}
                      <span className="mt-2 flex items-center gap-3 text-xs font-semibold text-neutral">
                        <span className="flex items-center gap-1"><Clock className="size-3.5" /> {s.durationMinutes} min</span>
                        <span className="text-ink">{s.priceIsFrom ? "from " : ""}{formatPrice(s.basePrice, currency)}</span>
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {/* Step 2 — vehicle */}
        {step === 1 && (
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Your vehicle</h2>
            <p className="mt-1 mb-6 text-neutral">So our technicians can prepare the right parts.</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Make" htmlFor="make" required>
                <select
                  id="make"
                  className={selectClass}
                  value={makeId}
                  onChange={(e) => {
                    setMakeId(e.target.value);
                    setModelId("");
                  }}
                >
                  <option value="">Select make…</option>
                  {makes.map((m) => (
                    <option key={m.id} value={m.id}>{m.name}</option>
                  ))}
                  <option value={OTHER}>Other…</option>
                </select>
              </FormField>
              {makeId === OTHER ? (
                <FormField label="Make name" htmlFor="makeName" required>
                  <Input id="makeName" value={makeName} onChange={(e) => setMakeName(e.target.value)} />
                </FormField>
              ) : (
                <FormField label="Model" htmlFor="model" required>
                  <select
                    id="model"
                    className={selectClass}
                    value={modelId}
                    disabled={!makeId}
                    onChange={(e) => setModelId(e.target.value)}
                  >
                    <option value="">Select model…</option>
                    {make?.models.map((m) => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                    <option value={OTHER}>Other…</option>
                  </select>
                </FormField>
              )}
              {(makeId === OTHER || modelId === OTHER) && (
                <FormField label="Model name" htmlFor="modelName" required>
                  <Input id="modelName" value={modelName} onChange={(e) => setModelName(e.target.value)} />
                </FormField>
              )}
              <FormField label="Year" htmlFor="year">
                <select id="year" className={selectClass} value={year} onChange={(e) => setYear(e.target.value)}>
                  <option value="">Select year…</option>
                  {years.map((y) => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Number plate (optional)" htmlFor="plate">
                <Input id="plate" className="uppercase" placeholder="GR-1234-22" value={plate} onChange={(e) => setPlate(e.target.value)} />
              </FormField>
              <FormField label="Mileage (optional)" htmlFor="mileage">
                <Input id="mileage" inputMode="numeric" placeholder="e.g. 84,000" value={mileage} onChange={(e) => setMileage(e.target.value)} />
              </FormField>
            </div>
          </section>
        )}

        {/* Step 3 — date & time */}
        {step === 2 && (
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">Pick a date and time</h2>
            <p className="mt-1 mb-6 text-neutral">This visit takes about {duration} minutes.</p>
            <div className="-mx-4 flex snap-x gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
              {days.map((d) => (
                <button
                  key={d.date}
                  type="button"
                  disabled={d.closed}
                  onClick={() => loadDate(d.date)}
                  className={cn(
                    "flex w-[68px] shrink-0 snap-start flex-col items-center rounded-2xl border py-3 transition-colors disabled:opacity-40",
                    date === d.date ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary/40",
                  )}
                >
                  <span className="text-[11px] font-semibold uppercase">{d.weekday}</span>
                  <span className="text-xl font-extrabold">{d.day}</span>
                  <span className="text-[11px]">{d.closed ? "Closed" : d.month}</span>
                </button>
              ))}
            </div>

            <div className="mt-6">
              {!date ? (
                <p className="text-sm text-neutral">Choose a day to see available times.</p>
              ) : loadingSlots || !availability ? (
                <p className="flex items-center gap-2 text-sm text-neutral"><Loader2 className="size-4 animate-spin" /> Checking availability…</p>
              ) : !availability.open ? (
                <Message variant="info">{availability.reason}</Message>
              ) : availability.slots.every((s) => !s.available) ? (
                <Message variant="warning">Fully booked that day — please try another date.</Message>
              ) : (
                <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 md:grid-cols-6">
                  {availability.slots.map((s) => (
                    <button
                      key={s.start}
                      type="button"
                      disabled={!s.available}
                      onClick={() => setStart(s.start)}
                      className={cn(
                        "h-11 rounded-full border text-sm font-semibold tabular-nums transition-colors disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-2 disabled:text-neutral/50 disabled:line-through",
                        start === s.start ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:border-primary",
                      )}
                    >
                      {s.time}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </section>
        )}

        {/* Step 4 — contact */}
        {step === 3 && (
          <section>
            <h2 className="text-2xl font-extrabold tracking-tight text-ink">{mode === "staff" ? "Customer details" : "Your details"}</h2>
            <p className="mt-1 mb-6 text-neutral">
              {mode === "staff" ? "We'll email a confirmation if an email is given." : "We'll send your confirmation here."}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <FormField label="Full name" htmlFor="name" required>
                  <Input id="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} />
                </FormField>
              </div>
              <FormField label="Phone" htmlFor="phone" required>
                <Input id="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </FormField>
              <FormField label={mode === "staff" ? "Email (optional)" : "Email"} htmlFor="email">
                <Input id="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </FormField>
              <div className="sm:col-span-2">
                <FormField label="Anything we should know? (optional)" htmlFor="notes">
                  <Textarea id="notes" rows={3} placeholder="Symptoms, noises, warning lights…" value={notes} onChange={(e) => setNotes(e.target.value)} />
                </FormField>
              </div>
              {mode === "staff" && (
                <FormField label="Booked via" htmlFor="source">
                  <select id="source" className={selectClass} value={source} onChange={(e) => setSource(e.target.value as "phone" | "walk_in")}>
                    <option value="phone">Phone call</option>
                    <option value="walk_in">Walk-in</option>
                  </select>
                </FormField>
              )}
            </div>
            {error && <Message variant="error" className="mt-5">{error}</Message>}
          </section>
        )}

        {/* Desktop nav */}
        <div className="mt-10 hidden items-center justify-between lg:flex">
          {step > 0 ? (
            <Button variant="ghost" onClick={() => setStep(step - 1)}><ArrowLeft /> Back</Button>
          ) : mode === "customer" ? (
            <Button asChild variant="ghost"><Link href="/services"><ArrowLeft /> All services</Link></Button>
          ) : <span />}
          {step < 3 ? (
            <Button size="lg" onClick={next}>Continue <ArrowRight /></Button>
          ) : (
            <Button size="lg" onClick={submit} loading={submitting}>{!submitting && <Check />} Confirm booking</Button>
          )}
        </div>
      </div>

      {/* Summary */}
      <aside className="rounded-xl border border-border bg-card p-5 shadow-card lg:sticky lg:top-24">
        <h3 className="font-bold text-ink">Booking summary</h3>
        <dl className="mt-4 space-y-3 text-sm">
          <div>
            <dt className="text-xs text-neutral">Services</dt>
            <dd className="text-ink">
              {chosen.length ? (
                <ul className="space-y-1">
                  {chosen.map((s) => (
                    <li key={s.id} className="flex justify-between gap-2">
                      <span>{s.name}</span>
                      <span className="tabular-nums text-neutral">{formatPrice(s.basePrice, currency)}</span>
                    </li>
                  ))}
                </ul>
              ) : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-neutral">Vehicle</dt>
            <dd className="text-ink">{vehicleText || "—"}{plate && ` · ${plate.toUpperCase()}`}</dd>
          </div>
          <div>
            <dt className="text-xs text-neutral">When</dt>
            <dd className="text-ink">{dayInfo && slotTime ? `${dayInfo.weekday} ${dayInfo.day} ${dayInfo.month} · ${slotTime}` : "—"}</dd>
          </div>
          <div className="flex items-end justify-between border-t border-border pt-3">
            <dt className="text-neutral">Estimate{anyFrom ? " (from)" : ""}</dt>
            <dd className="text-xl font-extrabold text-ink tabular-nums">{formatPrice(estimate, currency)}</dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-neutral">Pay at the workshop after the job. Parts are quoted separately if needed.</p>
      </aside>

      {/* Mobile sticky nav */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface/90 p-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center gap-2">
          {step > 0 && (
            <Button variant="outline" size="icon" className="size-12" aria-label="Back" onClick={() => setStep(step - 1)}>
              <ArrowLeft />
            </Button>
          )}
          {step < 3 ? (
            <Button size="lg" className="flex-1" onClick={next}>
              Continue · {formatPrice(estimate, currency)}
            </Button>
          ) : (
            <Button size="lg" className="flex-1" onClick={submit} loading={submitting}>Confirm booking</Button>
          )}
        </div>
      </div>
    </div>
  );
}
