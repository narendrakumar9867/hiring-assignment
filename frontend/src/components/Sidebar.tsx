"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { authApi } from "@/services/api";
import type { UserProfile } from "@/types";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    label: "Home",
    href: "/dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
        <polyline points="9 22 9 12 15 12 15 22" />
      </svg>
    ),
  },
  {
    label: "My Groups",
    href: "/dashboard/groups",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    label: "Assignments",
    href: "/dashboard/assignments",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
      </svg>
    ),
  },
  {
    label: "AI Teacher's Toolkit",
    href: "/dashboard/toolkit",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="12" cy="12" r="3" />
        <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
      </svg>
    ),
  },
  {
    label: "My Library",
    href: "/dashboard/library",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
        <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [user, setUser] = useState<UserProfile | null>(null);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  useEffect(() => {
    let active = true;

    const loadUser = async () => {
      try {
        const data = await authApi.checkAuth();
        if (active) setUser(data);
      } catch {
        if (active) setUser(null);
      }
    };

    loadUser();

    return () => {
      active = false;
    };
  }, []);

  return (
    <aside className="w-65 h-[calc(100vh-24px)] bg-[#f5f4f0] border border-[#e8e6e0] rounded-2xl flex flex-col px-3.5 py-5 fixed left-3 top-3 z-50 overflow-y-auto shadow-sm">

      <div className="flex items-center gap-3 px-2 pb-6">
        <div className="w-10 h-10 rounded-[10px] bg-[linear-gradient(180deg,#ffb24c_0%,#e86a24_52%,#b1271f_100%)] flex items-center justify-center shrink-0 shadow-[0_8px_18px_rgba(232,82,26,0.28)]">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M7.5 5.8h4.2L14 14.3l3.2-8.5h3.6L15.9 18h-3.5L7.5 5.8Z" fill="white" />
          </svg>
        </div>
        <span className="font-display text-[20px] font-bold text-[#2a2a2a] tracking-tight leading-none">
          Quriai
        </span>
      </div>

      <Link
        href="/dashboard/assignments/create"
        className="group mb-7 block rounded-full bg-[linear-gradient(180deg,#ff8f61_0%,#ea6d3f_100%)] p-0.75 shadow-[0_10px_20px_rgba(232,82,26,0.24)] transition-transform hover:scale-[1.01]"
      >
        <span className="flex w-full items-center justify-center gap-2 rounded-full bg-[#2f2f2f] px-4 py-3 text-[13.5px] font-medium text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-colors group-hover:bg-[#353535]">
          <svg width="30" height="26" viewBox="0 0 24 24" fill="none" className="shrink-0 -translate-y-px">
            <path d="M12 2.8l1.8 4.2 4.2 1.8-4.2 1.8L12 14.8l-1.8-4.2-4.2-1.8 4.2-1.8L12 2.8Z" fill="currentColor" />
            <path d="M18.6 1.7l.8 1.9 1.9.8-1.9.8-.8 1.9-.8-1.9-1.9-.8 1.9-.8.8-1.9Z" fill="currentColor" opacity="0.95" />
          </svg>
          <span>Create Assignment</span>
        </span>
      </Link>

      <nav className="flex flex-col gap-2 flex-1 mt-2">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] transition-colors ${
              isActive(item.href)
                ? "bg-[#eeeeee] text-[#2c2c2c] font-semibold"
                : "text-[#9a9a9a] hover:bg-[#f5f4f0] hover:text-[#2c2c2c]"
            }`}
          >
            <span className={`flex items-center shrink-0 ${isActive(item.href) ? "text-[#2c2c2c]" : "text-[#9a9a9a]"}`}>
              {item.icon}
            </span>
            <span className="truncate tracking-[-0.01em]">{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className="pt-4 flex flex-col gap-3 mt-3">
        <Link
          href="/profile"
          className="flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[14px] text-[#9a9a9a] hover:bg-[#f5f4f0] hover:text-[#2c2c2c] transition-colors mb-1"
        >
          <span className="flex items-center text-[#9a9a9a]">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </span>
          Settings
        </Link>

        <Link href="/profile" className="flex items-center gap-2.5 px-3 py-2.5 rounded-2xl bg-[#f2f2f2] cursor-pointer hover:bg-[#ececec] transition-colors">
          <div className="w-11 h-11 rounded-full bg-linear-to-br from-[#f5c4a1] to-[#f4d4c4] flex items-center justify-center shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e8521a" strokeWidth="1.8" strokeLinecap="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <div className="flex flex-col gap-0.5 min-w-0">
            <span className="text-[13px] font-semibold text-[#2c2c2c] truncate">
              {user?.schoolOrCollegeName || "School name"}
            </span>
            <span className="text-[11.5px] text-[#8c8c8c] truncate">
              {user?.address || "Address"}
            </span>
          </div>
        </Link>
      </div>
    </aside>
  );
}

