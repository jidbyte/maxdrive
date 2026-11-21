import { requireUserPage } from "@/shared/authz/session";
import { AccountNav } from "@/features/storefront/ui/account-nav";
import { Container } from "@/features/storefront/ui/section";

export const metadata = { title: { default: "My account", template: "%s · My account" }, robots: { index: false } };

export default async function AccountLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUserPage("/account");
  return (
    <Container className="py-8 sm:py-12">
      <h1 className="text-3xl font-extrabold tracking-tight text-ink sm:text-4xl">
        Hi{user.name ? `, ${user.name.split(" ")[0]}` : ""}
      </h1>
      <p className="mt-1 text-neutral">{user.email}</p>
      <div className="mt-8 flex flex-col gap-8 lg:flex-row">
        <AccountNav />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </Container>
  );
}
