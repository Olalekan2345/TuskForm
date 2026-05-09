"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import dynamic from "next/dynamic";

// Load SuiProviders (and therefore all of @mysten/dapp-kit) only on the client.
// ssr: false prevents BigInt module-evaluation errors in Turbopack/SSR.
const SuiProviders = dynamic(() => import("./SuiProviders"), { ssr: false });

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30_000 } },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SuiProviders>{children}</SuiProviders>
    </QueryClientProvider>
  );
}
