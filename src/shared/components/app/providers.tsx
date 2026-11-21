"use client";

import { Toaster } from "react-hot-toast";

import { ThemeProvider } from "./theme-provider";
import { TooltipProvider } from "@/shared/components/ui/tooltip";
import { PageLoader } from "./page-loader";

/**
 * Layout-level client providers. Auth needs no provider: the session lives
 * in an httpOnly cookie and server components read it directly.
 */
export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="dark"
      enableSystem
      disableTransitionOnChange
    >
      <TooltipProvider delayDuration={200}>{children}</TooltipProvider>
      <PageLoader />
      <Toaster
        position="top-center"
        toastOptions={{
          className: "!bg-card !text-ink !border !border-border !rounded-2xl !shadow-pop !text-sm",
          success: { iconTheme: { primary: "var(--success)", secondary: "var(--card)" } },
          error: { iconTheme: { primary: "var(--danger)", secondary: "var(--card)" } },
        }}
      />
    </ThemeProvider>
  );
}
