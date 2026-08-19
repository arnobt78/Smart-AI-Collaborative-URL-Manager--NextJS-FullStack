import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/page-auth";

export default async function EditListPage({ params }: { params: Promise<{ slug: string }> }) {
  await requirePageUser();
  const { slug } = await params;
  redirect(`/list/${encodeURIComponent(slug)}?dialog=edit`);
}
