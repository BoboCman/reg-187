import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { StoryPicker, StoryWorkspace } from "@/components/companion/StoryWorkspace";

export const metadata = { title: "New Policy Story — PolicyPlan" };

export default async function NewStoryPage({ searchParams }: { searchParams: Promise<{ story?: string }> }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const { story } = await searchParams;
  if (story === "apartment") return <StoryWorkspace initial={null} storyKey="apartment" />;
  return <StoryPicker />;
}
