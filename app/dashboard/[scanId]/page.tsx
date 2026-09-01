import { redirect } from "next/navigation";

export default function DashboardIndex({ params }: { params: { scanId: string } }) {
  redirect(`/dashboard/${params.scanId}/overview`);
}
