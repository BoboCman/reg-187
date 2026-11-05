import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanionWorkspace } from "@/components/companion/CompanionWorkspace";

export const metadata = { title: "New Illustration Companion — PolicyPlan" };

export default async function NewCompanionPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  return <CompanionWorkspace initial={null} />;
}
