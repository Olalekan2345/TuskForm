"use client";

import { create } from "zustand";

export interface WalletInfo {
  name: string;
  icon: string;
}

interface WalletStore {
  address: string | null;
  wallets: WalletInfo[];
  isConnecting: string | null;
  connect: ((walletName: string) => void) | null;
  disconnect: (() => void) | null;
  // Signs and executes a transaction; tx is a Transaction passed as-is from dapp-kit
  // Only callable from WalletBridge (inside SuiProviders)
  signAndExecuteAsync: ((tx: unknown) => Promise<{ digest: string }>) | null;
  // Internal setters — only called from WalletBridge (inside SuiProviders)
  _set: (patch: Partial<Omit<WalletStore, "_set">>) => void;
}

export const useWalletStore = create<WalletStore>()(set => ({
  address: null,
  wallets: [],
  isConnecting: null,
  connect: null,
  disconnect: null,
  signAndExecuteAsync: null,
  _set: patch => set(patch as Partial<WalletStore>),
}));
