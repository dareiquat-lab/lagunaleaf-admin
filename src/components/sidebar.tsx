"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { useTheme } from "next-themes";
import {
  LayoutDashboard,
  Package,
  ShoppingBag,
  Users,
  BarChart3,
  Tag,
  UserCheck,
  LogOut,
  Menu,
  X,
  Leaf,
  Sun,
  Moon,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from "framer-motion";

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
}

const navItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/dashboard/inventory", label: "Inventory", icon: Package },
  { href: "/dashboard/orders", label: "Orders", icon: ShoppingBag },
  { href: "/dashboard/clients", label: "Clients", icon: Users },
  { href: "/dashboard/analytics", label: "Analytics", icon: BarChart3 },
  { href: "/dashboard/employees", label: "Employees", icon: UserCheck },
  { href: "/dashboard/categories", label: "Categories", icon: Tag },
  { href: "/dashboard/import", label: "AI Import", icon: Sparkles },
];

interface SidebarProps {
  userEmail?: string | null;
}

function NavLink({ item, pathname }: { item: NavItem; pathname: string }) {
  const isActive =
    item.href === "/dashboard"
      ? pathname === "/dashboard"
      : pathname.startsWith(item.href);
  const Icon = item.icon;

  return (
    <Link
      href={item.href}
      className={cn(
        "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200 relative",
        isActive
          ? "bg-[#5A8A6E]/10 text-[#5A8A6E] dark:bg-[#6AAE82]/15 dark:text-[#6AAE82]"
          : "text-[#8A9A8E] hover:bg-[#F0F4F1] hover:text-[#2D3B35] dark:hover:bg-[#1F2E28] dark:hover:text-[#E8F0EC]"
      )}
    >
      {isActive && (
        <motion.div
          layoutId="activeNav"
          className="absolute left-0 top-0 bottom-0 w-0.5 bg-[#5A8A6E] dark:bg-[#6AAE82] rounded-r-full"
          initial={false}
          transition={{ type: "spring", stiffness: 400, damping: 30 }}
        />
      )}
      <Icon className="h-4 w-4 shrink-0" />
      {item.label}
    </Link>
  );
}

function DarkModeToggle() {
  const { theme, setTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      onClick={() => setTheme(isDark ? "light" : "dark")}
      className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-[#8A9A8E] hover:bg-[#F0F4F1] dark:hover:bg-[#1F2E28] hover:text-[#2D3B35] dark:hover:text-[#E8F0EC] transition-all"
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      {isDark ? "Light mode" : "Dark mode"}
    </button>
  );
}

export function Sidebar({ userEmail }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="p-6 border-b border-[#E8EDE9] dark:border-[#2A3D35]">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#5A8A6E] dark:bg-[#6AAE82] rounded-lg flex items-center justify-center">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="font-semibold text-[#2D3B35] dark:text-[#E8F0EC] text-sm leading-tight">Laguna Leaf</p>
            <p className="text-[10px] text-[#8A9A8E] leading-tight">Wellness Center</p>
          </div>
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink key={item.href} item={item} pathname={pathname} />
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-[#E8EDE9] dark:border-[#2A3D35] space-y-1">
        <DarkModeToggle />
        {userEmail && (
          <p className="text-xs text-[#8A9A8E] truncate px-3 py-1">{userEmail}</p>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/" })}
          className="w-full justify-start text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/5 dark:hover:bg-[#D97B6C]/10"
        >
          <LogOut className="h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 bottom-0 w-60 bg-white dark:bg-[#1A2620] border-r border-[#E8EDE9] dark:border-[#2A3D35] flex-col z-30 sidebar-nav">
        <SidebarContent />
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 h-14 bg-white dark:bg-[#1A2620] border-b border-[#E8EDE9] dark:border-[#2A3D35] z-30 flex items-center px-4 gap-3">
        <button
          onClick={() => setMobileOpen(true)}
          className="p-2 rounded-lg hover:bg-[#F0F4F1] dark:hover:bg-[#1F2E28] transition-colors"
        >
          <Menu className="h-5 w-5 text-[#2D3B35] dark:text-[#E8F0EC]" />
        </button>
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-[#5A8A6E] dark:bg-[#6AAE82] rounded-md flex items-center justify-center">
            <Leaf className="h-3 w-3 text-white" />
          </div>
          <span className="font-semibold text-[#2D3B35] dark:text-[#E8F0EC] text-sm">Laguna Leaf</span>
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
              className="lg:hidden fixed left-0 top-0 bottom-0 w-72 bg-white dark:bg-[#1A2620] z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-[#E8EDE9] dark:border-[#2A3D35]">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 bg-[#5A8A6E] dark:bg-[#6AAE82] rounded-lg flex items-center justify-center">
                    <Leaf className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="font-semibold text-[#2D3B35] dark:text-[#E8F0EC] text-sm">Laguna Leaf</p>
                    <p className="text-[10px] text-[#8A9A8E]">Wellness Center</p>
                  </div>
                </div>
                <button
                  onClick={() => setMobileOpen(false)}
                  className="p-2 rounded-lg hover:bg-[#F0F4F1] dark:hover:bg-[#1F2E28]"
                >
                  <X className="h-4 w-4 text-[#2D3B35] dark:text-[#E8F0EC]" />
                </button>
              </div>
              <nav className="flex-1 p-4 space-y-1 overflow-y-auto" onClick={() => setMobileOpen(false)}>
                {navItems.map((item) => (
                  <NavLink key={item.href} item={item} pathname={pathname} />
                ))}
              </nav>
              <div className="p-4 border-t border-[#E8EDE9] dark:border-[#2A3D35] space-y-1">
                <DarkModeToggle />
                {userEmail && (
                  <p className="text-xs text-[#8A9A8E] truncate px-3 py-1">{userEmail}</p>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => signOut({ callbackUrl: "/" })}
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
