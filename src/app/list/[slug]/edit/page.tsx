import { redirect } from "next/navigation";

export default async function EditListPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  redirect(`/list/${encodeURIComponent(slug)}?dialog=edit`);
}
