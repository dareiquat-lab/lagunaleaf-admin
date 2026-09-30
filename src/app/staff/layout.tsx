import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { StaffNav } from "@/components/staff-nav";

export default async function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/login");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((session.user as any)?.role !== "staff") redirect("/dashboard");

  return (
    <div className="min-h-screen bg-[#E3E7E4]">
      <StaffNav />
      <main className="max-w-4xl mx-auto px-4 py-6">
        {children}
      </main>
    </div>
  );
}
