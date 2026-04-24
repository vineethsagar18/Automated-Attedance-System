'use client'

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { signOut } from 'next-auth/react';
import Image from "next/image";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

const sidebarVariants = {
  open: { width: "16rem" },
  closed: { width: "4rem" },
};

const contentVariants = {
  open: { display: "block", opacity: 1 },
  closed: { display: "block", opacity: 1 },
};

const variants = {
  open: {
    x: 0,
    opacity: 1,
    transition: { x: { stiffness: 1000, velocity: -100 } },
  },
  closed: {
    x: -20,
    opacity: 0,
    transition: { x: { stiffness: 100 } },
  },
};

const transitionProps = {
  type: "tween",
  ease: "easeOut",
  duration: 0.2,
  staggerChildren: 0.1,
};

const staggerVariants = {
  open: {
    transition: { staggerChildren: 0.03, delayChildren: 0.02 },
  },
};

interface NavItem {
  href: string;
  label: string;
  adminOnly?: boolean;
  icon: string;
}

const navItems: NavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: 'dashboard' },
  { href: '/students', label: 'Students', adminOnly: true, icon: 'users' },
  { href: '/courses', label: 'Courses', adminOnly: true, icon: 'courses' },
  { href: '/attendance/mark', label: 'Mark Attendance', icon: 'scan' },
  { href: '/attendance/view', label: 'View Reports', icon: 'reports' },
  { href: '/qr/generate', label: 'QR Codes', adminOnly: true, icon: 'qr' },
];

function NavGlyph({ icon, className }: { icon: string; className?: string }) {
  const glyphClass = cn("h-4 w-4", className);

  if (icon === "dashboard") {
    return (
      <svg viewBox="0 0 20 20" className={glyphClass} fill="none" aria-hidden="true">
        <rect x="2" y="2" width="7" height="7" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="2" width="7" height="4" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="11" y="9" width="7" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
        <rect x="2" y="12" width="7" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    );
  }

  if (icon === "users") {
    return (
      <svg viewBox="0 0 20 20" className={glyphClass} fill="none" aria-hidden="true">
        <circle cx="7" cy="7" r="2.5" stroke="currentColor" strokeWidth="1.4" />
        <circle cx="14" cy="8" r="2" stroke="currentColor" strokeWidth="1.4" />
        <path d="M2.8 16c.6-2.2 2.2-3.2 4.2-3.2S10.7 13.8 11.2 16" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M11.7 15.6c.4-1.6 1.5-2.4 2.9-2.4 1.4 0 2.5.8 2.9 2.4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "courses") {
    return (
      <svg viewBox="0 0 20 20" className={glyphClass} fill="none" aria-hidden="true">
        <path d="M3 5.5h10.5a1.5 1.5 0 0 1 1.5 1.5v8.5H4.5A1.5 1.5 0 0 1 3 14V5.5Z" stroke="currentColor" strokeWidth="1.4" />
        <path d="M5.5 8h7M5.5 10.8h7M5.5 13.6h4.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "scan") {
    return (
      <svg viewBox="0 0 20 20" className={glyphClass} fill="none" aria-hidden="true">
        <path d="M2.5 7V4.5A2 2 0 0 1 4.5 2.5H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M17.5 7V4.5a2 2 0 0 0-2-2H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M2.5 13v2.5a2 2 0 0 0 2 2H7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M17.5 13v2.5a2 2 0 0 1-2 2H13" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
        <path d="M5.5 10h9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      </svg>
    );
  }

  if (icon === "reports") {
    return (
      <svg viewBox="0 0 20 20" className={glyphClass} fill="none" aria-hidden="true">
        <path d="M4.5 17V10M10 17V7M15.5 17V4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
    );
  }

  return (
    <svg viewBox="0 0 20 20" className={glyphClass} fill="none" aria-hidden="true">
      <path d="M10 3.5 16 6.7v6.6L10 16.5 4 13.3V6.7L10 3.5Z" stroke="currentColor" strokeWidth="1.4" />
      <path d="M7.5 10h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
      <path d="M10 7.5v5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
    </svg>
  );
}

interface Props {
  userRole: string;
  userName: string;
}

export function Sidebar({ userRole, userName }: Props) {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const pathname = usePathname();
  const now = new Date();
  const localTime = now.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
  const localDate = now.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const visibleItems = navItems.filter(
    (item) => !item.adminOnly || userRole === 'ADMIN'
  );

  const isActive = (href: string) =>
    pathname === href || (href !== '/dashboard' && pathname.startsWith(href));

  return (
    <TooltipProvider delayDuration={120}>
      <motion.div
      className={cn(
        "sidebar z-40 h-full shrink-0 border-r border-[#FFC193]/55 bg-[#FFEDCE]/90 relative backdrop-blur-sm",
      )}
      initial={isCollapsed ? "closed" : "open"}
      animate={isCollapsed ? "closed" : "open"}
      variants={sidebarVariants}
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      transition={transitionProps as any}
      onMouseEnter={() => setIsCollapsed(false)}
      onMouseLeave={() => setIsCollapsed(true)}
    >
      <motion.div
        className="relative z-40 flex text-foreground h-full shrink-0 flex-col transition-all bg-transparent"
        variants={contentVariants}
      >
        <motion.ul variants={staggerVariants} className="flex h-full flex-col">
          <div className="flex grow flex-col items-center">
            <div className="flex h-22 w-full shrink-0 border-b border-[#FFC193]/60 px-4 py-3 items-center justify-center">
              <div className="flex items-center gap-3 w-full">
                <div className="shrink-0 w-10 h-10 relative flex items-center justify-center rounded-xl border border-[#FF8383]/40 bg-white/75">
                  <Image src="/logo.png" alt="Logo" width={30} height={30} className="object-contain" />
                </div>
                <motion.li variants={variants} className="flex w-fit items-center gap-2">
                  {!isCollapsed && (
                    <div>
                      <p className="mono-label">Attendance Suite</p>
                      <p className="text-lg font-semibold tracking-tight text-[#1f1f1f] mt-0.5">
                        AttendEase
                      </p>
                    </div>
                  )}
                </motion.li>
              </div>
            </div>

            {!isCollapsed && (
              <div className="w-full p-3">
                <div className="rounded-2xl border border-[#FFC193]/65 bg-white/86 px-3 py-3 soft-enter">
                  <p className="mono-label">Local Time</p>
                  <p className="font-display text-3xl text-[#1d1d1d] leading-none mt-1">{localTime}</p>
                  <p className="mono-label mt-2">{localDate}</p>
                </div>
              </div>
            )}

            <div className="flex h-full w-full flex-col pt-1">
              <div className="flex grow flex-col gap-2">
                <ScrollArea className="h-full grow px-3">
                  <div className={cn("flex w-full flex-col gap-2")}>
                    {visibleItems.map((item) => {
                      const linkNode = (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={cn(
                            "flex h-11 w-full flex-row items-center rounded-2xl px-2.5 py-2 transition-all duration-200 border",
                            isActive(item.href)
                              ? "bg-[#FF3737] text-white border-[#FF3737]"
                              : "border-[#FFC193]/65 bg-white/72 text-[#444] hover:border-[#FF8383] hover:bg-white"
                          )}
                        >
                          <div
                            className={cn(
                              "flex h-7 w-7 items-center justify-center rounded-lg shrink-0",
                              isActive(item.href) ? "bg-white/15 text-white" : "bg-[#FFEDCE] text-[#444]",
                            )}
                          >
                            <NavGlyph icon={item.icon} />
                          </div>
                          <motion.li variants={variants} className="min-w-0">
                            {!isCollapsed && <p className="ml-3 truncate text-sm font-medium">{item.label}</p>}
                          </motion.li>
                        </Link>
                      );

                      if (!isCollapsed) return linkNode;

                      return (
                        <Tooltip key={item.href}>
                          <TooltipTrigger asChild>{linkNode}</TooltipTrigger>
                          <TooltipContent side="right">{item.label}</TooltipContent>
                        </Tooltip>
                      );
                    })}
                  </div>
                </ScrollArea>
              </div>

              {!isCollapsed && (
                <div className="px-3 pb-3">
                  <div className="rounded-2xl border border-[#FFC193]/65 bg-white/82 px-3 py-3">
                    <div className="flex items-center justify-between">
                      <p className="mono-label">System Load</p>
                      <p className="mono-label text-[#ff3737]">Live</p>
                    </div>
                    <div className="segment-track mt-2.5">
                      {[...Array(12)].map((_, i) => (
                        <span key={i} className={cn("segment", i < 8 && "on")} />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex flex-col p-4 border-t border-[#FFC193]/60 gap-2">
                <Button
                  variant="ghost"
                  onClick={() => signOut({ callbackUrl: '/login' })}
                  className="w-full justify-start h-10 px-2 rounded-xl text-[#8a2a2a] hover:text-[#8a2a2a] hover:bg-[#FF8383]/20 transition-all"
                >
                  <div className="flex items-center justify-center w-6 h-6 rounded shrink-0 bg-[#FF8383]/30">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <path d="M12.8 6.8 7.2 12.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M7.2 6.8 12.8 12.4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                      <path d="M17 10a7 7 0 1 1-2-4.9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <motion.li variants={variants}>
                    {!isCollapsed && (
                      <p className="ml-3 text-sm font-medium">Sign out</p>
                    )}
                  </motion.li>
                </Button>

                <div className="flex h-12 w-full flex-row items-center gap-3 rounded-xl px-2 py-2 bg-white/78 border border-[#FFC193]/65 mt-2">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[#FF8383]/50 bg-[#FFEDCE] text-[#2a2a2a]">
                    <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" aria-hidden="true">
                      <circle cx="10" cy="7" r="3" stroke="currentColor" strokeWidth="1.5" />
                      <path d="M4.5 16c.8-2.3 2.7-3.6 5.5-3.6s4.7 1.3 5.5 3.6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </div>
                  <motion.li
                    variants={variants}
                    className="flex flex-col flex-1 min-w-0"
                  >
                    {!isCollapsed && (
                      <>
                        <p className="text-sm font-semibold truncate text-[#202020]">{userName}</p>
                        <p className="mono-label truncate">{userRole}</p>
                      </>
                    )}
                  </motion.li>
                </div>
              </div>
            </div>
          </div>
        </motion.ul>
      </motion.div>
    </motion.div>
    </TooltipProvider>
  );
}
