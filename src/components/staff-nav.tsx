"use client";

import { signOut } from "next-auth/react";
import { Leaf, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";

export function StaffNav() {
  return (
    <header className="bg-white border-b border-[#E8EDE9] sticky top-0 z-10">
      <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-gradient-to-br from-[#5A8A6E] to-[#4A7A5E] rounded-xl flex items-center justify-center shadow-sm">
            <Leaf className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-[#2D3B35]">Laguna Leaf</span>
          <span className="text-xs font-medium text-[#5A8A6E] bg-[#5A8A6E]/10 px-2 py-0.5 rounded-full">
            Staff
          </span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="text-[#8A9A8E] hover:text-[#D97B6C] hover:bg-[#D97B6C]/10 gap-1.5"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sign out
        </Button>
      </div>
    </header>
  );
}
