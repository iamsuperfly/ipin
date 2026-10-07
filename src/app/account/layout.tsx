"use client";

import { CircleWallet } from "@/components/CircleWallet";

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="mx-auto max-w-2xl px-5 pt-8">
        <CircleWallet />
      </div>
      {children}
    </>
  );
}
