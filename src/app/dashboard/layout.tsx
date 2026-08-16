import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session) redirect("/");

  return (
    <div className="min-h-screen bg-[#E3E7E4] dark:bg-[#111816]">
      <Sidebar userEmail={session.user?.email} />
      <main className="lg:ml-60 pt-0 lg:pt-0">
        <div className="h-14 lg:hidden" />
        {children}
      </main>
    </div>
  );
}
