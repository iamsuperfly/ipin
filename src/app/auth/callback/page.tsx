"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase";

export default function AuthCallback() {
  const router = useRouter();
  useEffect(() => {
    const supabase = supabaseBrowser();
    if (!supabase) {
      router.replace("/account");
      return;
    }
    supabase.auth.getSession().finally(() => router.replace("/account"));
  }, [router]);
  return <main className="px-5 pt-16">Signing you in…</main>;
}
