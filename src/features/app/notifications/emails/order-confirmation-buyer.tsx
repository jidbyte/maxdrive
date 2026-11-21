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

export type OrderConfirmationBuyerEmailProps = {
  storeName: string;
  buyerName: string;
  saleNumber: string;
  currency: string;
  items: Array<{ name: string; quantity: number; subtotal: number }>;
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number;
  fulfilment: "delivery" | "pickup" | "workshop";
  paid: boolean;
  orderUrl: string;
  supportEmail: string | null;
};

const brand = "#2563eb";

export function OrderConfirmationBuyerEmail(p: OrderConfirmationBuyerEmailProps) {
  const fmt = (n: number) => formatPrice(n, p.currency);
  const firstName = p.buyerName.split(" ")[0];
  return (
    <Html>
      <Head />
      <Preview>{`Order ${p.saleNumber} confirmed — thanks for shopping with ${p.storeName}`}</Preview>
      <Body style={{ backgroundColor: "#f1f6fe", fontFamily: "Helvetica, Arial, sans-serif", margin: 0 }}>
        <Container style={{ maxWidth: 560, margin: "32px auto", backgroundColor: "#ffffff", borderRadius: 24, padding: 32 }}>
          <Text style={{ fontWeight: 800, letterSpacing: "0.06em", fontSize: 18, margin: 0 }}>
            MAX<span style={{ color: brand }}>DRIVE</span>
          </Text>
          <Heading style={{ fontSize: 24, margin: "24px 0 8px", color: "#0a1325" }}>
            {p.paid ? "Payment received — order confirmed" : "Order received"}
          </Heading>
          <Text style={{ color: "#5d6a80", fontSize: 15, lineHeight: "24px", margin: 0 }}>
            Hi {firstName}, thanks for your order <b>{p.saleNumber}</b>.{" "}
            {p.fulfilment === "pickup"
              ? p.paid
                ? "We'll let you know as soon as it's ready for pickup."
                : "Your items are reserved — pay when you collect them at our store."
              : "We'll let you know as soon as it's on its way."}
          </Text>

          <Section style={{ marginTop: 24 }}>
            {p.items.map((item, i) => (
              <table key={i} width="100%" style={{ fontSize: 14, color: "#0a1325", padding: "6px 0" }}>
                <tbody>
                  <tr>
                    <td>
                      {item.name} <span style={{ color: "#5d6a80" }}>× {item.quantity}</span>
                    </td>
                    <td align="right">{fmt(item.subtotal)}</td>
                  </tr>
                </tbody>
              </table>
            ))}
            <Hr style={{ borderColor: "#e5ecf6", margin: "16px 0" }} />
            <Row label="Subtotal" value={fmt(p.subtotal)} />
            {p.discountAmount > 0 && <Row label="Discount" value={`−${fmt(p.discountAmount)}`} />}
            {p.fulfilment === "delivery" && (
              <Row label="Delivery" value={p.deliveryFee > 0 ? fmt(p.deliveryFee) : "Free"} />
            )}
            <Row label="Total" value={fmt(p.total)} bold />
          </Section>

          <Section style={{ textAlign: "center", marginTop: 28 }}>
            <Button
              href={p.orderUrl}
              style={{ backgroundColor: brand, color: "#fff", borderRadius: 999, padding: "14px 28px", fontWeight: 700, fontSize: 15 }}
            >
              View your order
            </Button>
          </Section>

          {p.supportEmail && (
            <Text style={{ color: "#5d6a80", fontSize: 13, marginTop: 28 }}>
              Questions? Reply to this email or contact {p.supportEmail}.
            </Text>
          )}
        </Container>
      </Body>
    </Html>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <table width="100%" style={{ fontSize: bold ? 16 : 14, fontWeight: bold ? 700 : 400, color: "#0a1325", padding: "3px 0" }}>
      <tbody>
        <tr>
          <td style={{ color: bold ? "#0a1325" : "#5d6a80" }}>{label}</td>
          <td align="right">{value}</td>
        </tr>
      </tbody>
    </table>
  );
}
