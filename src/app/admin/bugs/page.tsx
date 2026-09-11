import { getBugsPageData } from "@/server/services/bug.service";
import { BugsListWidget } from "@/widgets/bugs-list/ui/BugsListWidget";

export const dynamic = "force-dynamic";

export default async function BugsPage() {
  const { bugs, projects } = await getBugsPageData();
  return <BugsListWidget bugs={bugs} projects={projects} />;
}
