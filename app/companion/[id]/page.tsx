import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CompanionWorkspace } from "@/components/companion/CompanionWorkspace";
import { StoryWorkspace } from "@/components/companion/StoryWorkspace";
import { caseView, ServiceError } from "@/lib/companion/service";
import { companionDeps } from "@/lib/companion/supabase-store";

export const metadata = { title: "Policy Story — PolicyPlan" };
export const dynamic = "force-dynamic";

export default async function CompanionCasePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const deps = companionDeps("");
  if (!deps) throw new Error("The Companion service is not configured (SUPABASE_SERVICE_ROLE_KEY).");
  try {
    const view = await caseView(deps.store, user.id, id);
    const initial = JSON.parse(JSON.stringify(view));
    // Story cases open the one-screen story flow; earlier Companion cases keep their workspace.
    if (view.story?.story_key === "apartment") return <StoryWorkspace initial={initial} storyKey="apartment" />;
    return <CompanionWorkspace initial={initial} />;
  } catch (e) {
    if (e instanceof ServiceError && e.status === 404) notFound();
    throw e;
  }
}
