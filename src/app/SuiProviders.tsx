"use client";

// This file is the ONLY place in the app that imports from @mysten/dapp-kit.
// It is always loaded dynamically (ssr: false) from providers.tsx,
// so @mysten/dapp-kit is never evaluated during SSR — preventing the BigInt error.

import { type ReactNode, useEffect } from "react";
import {
  SuiClientProvider,
  WalletProvider,
  useCurrentAccount,
  useWallets,
  useConnectWallet,
  useDisconnectWallet,
  useSignAndExecuteTransaction,
  useSignPersonalMessage,
} from "@mysten/dapp-kit";
import { useWalletStore } from "@/lib/walletStore";

const NETWORKS = {
  mainnet: { url: "https://fullnode.mainnet.sui.io:443", network: "mainnet" as const },
  testnet: { url: "https://fullnode.testnet.sui.io:443", network: "testnet" as const },
};
// Match the Walrus SDK network so wallet signing works on the right chain
const ACTIVE_NETWORK = (process.env.NEXT_PUBLIC_WALRUS_NETWORK ?? "testnet") as "mainnet" | "testnet";

// Syncs dapp-kit wallet state into the Zustand store so all other
// components can read wallet info without importing @mysten/dapp-kit.
function WalletBridge() {
  const account      = useCurrentAccount();
  const wallets      = useWallets();
  const { mutate: connectWallet }    = useConnectWallet();
  const { mutate: disconnectWallet } = useDisconnectWallet();
  const { mutateAsync: signAndExecute }    = useSignAndExecuteTransaction();
  const { mutateAsync: signPersonalMsg }   = useSignPersonalMessage();
  const _set = useWalletStore(s => s._set);

  useEffect(() => {
    _set({ address: account?.address ?? null });
  }, [account?.address, _set]);

  useEffect(() => {
    _set({
      wallets: wallets.map(w => ({ name: w.name, icon: w.icon })),
      connect: (walletName: string) => {
        const wallet = wallets.find(w => w.name === walletName);
        if (!wallet) return;
        _set({ isConnecting: walletName });
        connectWallet({ wallet }, {
          onSuccess: () => _set({ isConnecting: null }),
          onError:   () => _set({ isConnecting: null }),
        });
      },
      disconnect: () => disconnectWallet(),
      signAndExecuteAsync: async (tx: unknown) => {
        const result = await signAndExecute({
          transaction: tx as Parameters<typeof signAndExecute>[0]["transaction"],
        });
        return { digest: result.digest };
      },
      signPersonalMessageAsync: async (message: Uint8Array) => {
        const result = await signPersonalMsg({ message });
        return { signature: result.signature };
      },
    });
  }, [wallets, connectWallet, disconnectWallet, signAndExecute, signPersonalMsg, _set]);

  return null;
}

export default function SuiProviders({ children }: { children: ReactNode }) {
  return (
    <SuiClientProvider networks={NETWORKS} defaultNetwork={ACTIVE_NETWORK}>
      <WalletProvider autoConnect>
        <WalletBridge />
        {children}
      </WalletProvider>
    </SuiClientProvider>
  );
}
