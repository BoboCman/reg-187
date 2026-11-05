import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoryPicker, StoryWorkspace } from "@/components/companion/StoryWorkspace";
import { companionDeps } from "@/lib/companion/supabase-store";

export const metadata = { title: "New Policy Story — PolicyPlan" };

export default async function NewStoryPage({ searchParams }: { searchParams: Promise<{ story?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { story } = await searchParams;
  if (story === "apartment") {
    // Pre-fill the cover with the advisor's branding from Settings.
    const b = await companionDeps("")?.store.getBranding(user.id).catch(() => null);
    const branding = { advisor_name: b?.advisor_name ?? "", firm_name: b?.firm_name ?? "", has_logo: !!b?.logo_base64 };
    return <StoryWorkspace initial={null} storyKey="apartment" branding={branding} />;
  }
  return <StoryPicker />;
}
