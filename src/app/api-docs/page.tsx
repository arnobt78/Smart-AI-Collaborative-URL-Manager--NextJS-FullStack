import ApiDocsPage from "@/components/pages/ApiDocsPage";
import { requirePageUser } from "@/lib/page-auth";

export const dynamic = "force-dynamic";

export default async function ApiDocs() {
  await requirePageUser();
  return <ApiDocsPage />;
}
