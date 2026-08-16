"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Leaf, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { motion } from "framer-motion";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        password,
        redirect: false,
      });

      if (result?.error) {
        toast.error("Incorrect password");
      } else {
        router.push("/dashboard");
        router.refresh();
      }
    } catch {
      toast.error("Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#E3E7E4] flex items-center justify-center p-4">
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#5A8A6E]/5 rounded-full blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#A8C5B2]/10 rounded-full blur-3xl" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="relative w-full max-w-sm"
      >
        <div className="bg-white rounded-2xl border border-[#E8EDE9] shadow-lg p-8">
          <div className="flex flex-col items-center mb-8">
            <div className="w-14 h-14 bg-gradient-to-br from-[#5A8A6E] to-[#4A7A5E] rounded-2xl flex items-center justify-center mb-4 shadow-md">
              <Leaf className="h-7 w-7 text-white" />
            </div>
            <h1 className="text-2xl font-semibold text-[#5A8A6E] tracking-tight">Laguna Leaf</h1>
            <p className="text-sm text-[#8A9A8E] mt-1">Wellness Center · Admin Portal</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password">Passkey</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter passkey"
                required
                autoComplete="current-password"
                autoFocus
              />
            </div>

            <Button type="submit" className="w-full mt-2" size="lg" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Signing in...
                </>
              ) : (
                "Enter"
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-[#8A9A8E] mt-6">
          Internal use only · Laguna Leaf Wellness Center
        </p>
      </motion.div>
    </div>
  );
}
