import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { SignInForm } from "./sign-in-form";

const ERROR_MESSAGES: Record<string, string> = {
  invalid_invite: "This invite link is no longer valid. Ask an admin to resend it.",
};
const DEFAULT_LINK_ERROR =
  "This sign-in link is no longer valid. Enter your email to get a new one.";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (session) {
    redirect("/");
  }

  const { error } = await searchParams;
  const linkError = error ? (ERROR_MESSAGES[error] ?? DEFAULT_LINK_ERROR) : undefined;

  return <SignInForm initialError={linkError} />;
}
