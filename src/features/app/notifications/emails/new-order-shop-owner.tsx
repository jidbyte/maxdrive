import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";

import { formatPrice } from "@/shared/utils/currency";

export type NewOrderStaffEmailProps = {
  saleNumber: string;
  buyerName: string;
  buyerEmail: string;
  buyerPhone: string;
  fulfilment: string;
  deliveryAddress: string | null;
  paid: boolean;
  currency: string;
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  total: number;
  adminUrl: string;
  notes: string | null;
};

export function NewOrderStaffEmail(p: NewOrderStaffEmailProps) {
  const fmt = (n: number) => formatPrice(n, p.currency);
  return (
    <Html>
      <Head />
      <Preview>{`New ${p.paid ? "paid " : ""}order ${p.saleNumber} — ${fmt(p.total)}`}</Preview>
      <Body style={{ backgroundColor: "#f1f6fe", fontFamily: "Helvetica, Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", backgroundColor: "#fff", borderRadius: 24, padding: 32 }}>
          <Heading style={{ fontSize: 22, margin: 0, color: "#0a1325" }}>
            New order {p.saleNumber}
          </Heading>
          <Text style={{ color: "#5d6a80", fontSize: 14 }}>
            {p.paid ? "Paid online via Paystack." : "Payment pending (pay on pickup)."} Fulfilment:{" "}
            <b>{p.fulfilment}</b>
          </Text>
          <Section>
            <Text style={{ fontSize: 14, margin: "4px 0" }}><b>{p.buyerName}</b></Text>
            <Text style={{ fontSize: 14, margin: "4px 0" }}>{p.buyerEmail} · {p.buyerPhone}</Text>
            {p.deliveryAddress && <Text style={{ fontSize: 14, margin: "4px 0" }}>{p.deliveryAddress}</Text>}
            {p.notes && <Text style={{ fontSize: 14, margin: "4px 0", color: "#b45309" }}>Note: {p.notes}</Text>}
          </Section>
          <Hr style={{ borderColor: "#e5ecf6" }} />
          {p.items.map((item, i) => (
            <Text key={i} style={{ fontSize: 14, margin: "4px 0" }}>
              {item.quantity} × {item.name} — {fmt(item.subtotal)}
            </Text>
          ))}
          <Text style={{ fontSize: 16, fontWeight: 700 }}>Total: {fmt(p.total)}</Text>
          <Button
            href={p.adminUrl}
            style={{ backgroundColor: "#2563eb", color: "#fff", borderRadius: 999, padding: "12px 24px", fontWeight: 700 }}
          >
            Open in admin
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
