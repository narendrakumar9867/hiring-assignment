"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

interface NavbarProps {
  title: string;
  showBack?: boolean;
}

export default function Navbar({ title, showBack = false }: NavbarProps) {
  const router = useRouter();

  return (
    <header className="sticky top-3 z-40 bg-transparent flex-shrink-0">
      <div className="mx-auto w-[calc(100%-48px)] bg-white rounded-2xl h-14 flex items-center justify-between px-6 border border-[#e8e6e0] shadow-sm">
        <div className="flex items-center gap-2">
          {showBack && (
            <button
              onClick={() => router.back()}
              aria-label="Go back"
              className="w-8 h-8 rounded-lg flex items-center justify-center text-[#6b6b6b] hover:bg-[#f5f4f0] hover:text-[#1a1a1a] transition-colors"
            >
              <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
          )}
          <div className="flex items-center gap-2">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#a0a0a0" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="7" height="7" />
              <rect x="14" y="3" width="7" height="7" />
              <rect x="3" y="14" width="7" height="7" />
              <rect x="14" y="14" width="7" height="7" />
            </svg>
            <span className="font-display text-[15px] font-bold text-[#1a1a1a] tracking-tight">
              {title}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            aria-label="Notifications"
            className="relative w-9 h-9 rounded-lg flex items-center justify-center text-[#6b6b6b] hover:bg-[#f5f4f0] hover:text-[#1a1a1a] transition-colors"
          >
            <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-[#e8521a] rounded-full border border-white" />
          </button>

          <Link href="/profile" className="flex items-center gap-1.5 pl-1.5 pr-2.5 py-1.5 rounded-full border border-[#e8e6e0] text-[13px] font-medium text-[#1a1a1a] hover:bg-[#f5f4f0] hover:border-[#a0a0a0] transition-colors font-body">
            <div className="w-6 h-6 rounded-full bg-gradient-to-br from-[#f5c4a1] to-[#f4d4c4] flex items-center justify-center flex-shrink-0">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#e8521a" strokeWidth="2" strokeLinecap="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <span>Profile</span>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </Link>
        </div>
      </div>
    </header>
  );
}