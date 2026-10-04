"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  ShoppingBag,
  Plus,
  LogOut,
  Menu,
  X,
  Leaf,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
}

const navItems: NavItem[] = [
  { href: "/staff", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/staff/orders", label: "Orders", icon: ShoppingBag },
  { href: "/staff/orders/new", label: "New Order", icon: Plus },
];

function NavLink({ item, pathname, onClick }: { item: NavItem; pathname: string; onClick?: () => void }) {
  const isActive = item.exact
    ? pathname === item.href
    : pathname === item.href || pathname.startsWith(item.href + "/");
  const isNew = item.href === "/staff/orders/new";
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      onClick={onClick}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
        isNew
          ? "bg-[#5A8A6E] text-white hover:bg-[#4A7A5E]"
          : isActive
          ? "bg-[#5A8A6E]/10 text-[#5A8A6E]"
          : "text-[#8A9A8E] hover:bg-[#F0F4F1] hover:text-[#2D3B35]"
      )}
    >
      {isActive && !isNew && (
        <motion.div
          layoutId="staffActiveNav"
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#5A8A6E] rounded-r-full"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function SidebarContent({ pathname, onNav }: { pathname: string; onNav?: () => void }) {
  return (
    <div className="flex flex-col h-full">
      <div className="p-6 border-b border-[#E8EDE9]">
        <Link href="/staff" className="flex items-center gap-2.5" onClick={onNav}>
          <div className="w-8 h-8 bg-[#5A8A6E] rounded-lg flex items-center justify-center">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-[#2D3B35] text-sm leading-tight">Laguna Leaf</p>
            <p className="text-[10px] text-[#5A8A6E] leading-tight font-medium">Staff Portal</p>
          </div>
        </Link>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} onClick={onNav} />
        ))}
      </nav>

      <div className="p-4 border-t border-[#E8EDE9]">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="w-full justify-start text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/5"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );
}

export function StaffSidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white border-r border-[#E8EDE9] flex-col z-30">
        <SidebarContent pathname={pathname} />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white border-b border-[#E8EDE9] z-30 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-[#F0F4F1] transition-colors"
        >
          <Menu className="h-5 w-5 text-[#2D3B35]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#5A8A6E] rounded-md flex items-center justify-center">
            <Leaf className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold text-[#2D3B35] text-sm">Laguna Leaf</span>
          <span className="text-xs font-medium text-[#5A8A6E] bg-[#5A8A6E]/10 px-2 py-0.5 rounded-full">Staff</span>
        </div>
      </div>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="lg:hidden fixed inset-0 bg-black/30 z-40"
              onClick={() => setMobileOpen(false)}
            />
            <motion.aside
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#E8EDE9]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#5A8A6E] rounded-lg flex items-center justify-center">
                    <Leaf className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#2D3B35] text-sm">Laguna Leaf</p>
                    <p className="text-[10px] text-[#5A8A6E] font-medium">Staff Portal</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#F0F4F1]"
                >
                  <X className="h-4 w-4 text-[#2D3B35]" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto" onClick={() => setMobileOpen(false)}>
                {navItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </nav>
              <div className="p-4 border-t border-[#E8EDE9]">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full justify-start text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/5"
                >
                  <LogOut className="h-4 w-4" />
                  Sign Out
                </Button>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
