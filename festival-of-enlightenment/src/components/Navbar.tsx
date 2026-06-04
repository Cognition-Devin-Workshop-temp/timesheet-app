"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <nav className="bg-white border-b border-saffron/10 shadow-sm sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center gap-2.5">
            <span className="text-2xl">🙏</span>
            <span className="text-lg font-bold text-deep-blue hidden sm:inline">
              Festival of Enlightenment
            </span>
            <span className="text-lg font-bold text-deep-blue sm:hidden">
              FoE
            </span>
          </Link>

          <button
            onClick={handleLogout}
            className="text-sm px-4 py-2 rounded-lg text-sage hover:text-deep-blue hover:bg-cream transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </nav>
  );
}
