import { redirect } from "next/navigation";
import { requireSession } from "@/lib/require-session";

export default async function Home() {
  await requireSession();
  redirect("/courses");
}
