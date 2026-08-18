import { redirect } from "next/navigation";

export default function NewListPage() {
  redirect("/lists?dialog=create");
}
