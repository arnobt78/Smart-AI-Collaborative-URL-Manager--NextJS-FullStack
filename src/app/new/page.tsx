import { redirect } from "next/navigation";
import { requirePageUser } from "@/lib/page-auth";

export default async function NewListPage() {
  await requirePageUser();
  redirect("/lists?dialog=create");
}
