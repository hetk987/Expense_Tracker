import { getDashboardData } from "@/app/actions";
import AuthWrapper from "@/components/AuthWrapper";
import DashboardClient from "@/components/DashboardClient";
import { getCurrentYearRange } from "@/lib/utils";

export default async function DashboardPage() {
  let initialData = null;
  try {
    const result = await getDashboardData({
      limit: 1000,
      ...getCurrentYearRange(),
    });
    if (result && !("error" in result)) {
      initialData = result;
    }
  } catch {
    initialData = null;
  }

  return (
    <AuthWrapper>
      <DashboardClient initialData={initialData} />
    </AuthWrapper>
  );
}
