import { notFound } from "next/navigation";
import { getScan } from "@/lib/store/scanStore";
import { Sidebar } from "@/components/dashboard/Sidebar";
import { Topbar } from "@/components/dashboard/Topbar";
import { MobileNav } from "@/components/dashboard/MobileNav";

export default async function DashboardLayout({
  children,
  params
}: {
  children: React.ReactNode;
  params: { scanId: string };
}) {
  const scan = await getScan(params.scanId);
  if (!scan) notFound();

  return (
    <div className="flex min-h-screen">
      <Sidebar scanId={params.scanId} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar source={scan.source} createdAt={scan.createdAt} />
        <MobileNav scanId={params.scanId} />
        <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
