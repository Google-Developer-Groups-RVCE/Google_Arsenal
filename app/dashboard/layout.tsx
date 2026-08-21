"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (!user && pathname !== "/dashboard/login") {
        router.replace("/dashboard/login");
      } else if (user && pathname === "/dashboard/login") {
        router.replace("/dashboard");
      } else {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [pathname, router]);

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center bg-black text-white">Loading...</div>;
  }

  return (
    <div className="auction-theme min-h-screen font-body text-text">
      <link href="https://api.fontshare.com/v2/css?f[]=general-sans@400,600&display=swap" rel="stylesheet" />
      {children}
    </div>
  );
}
