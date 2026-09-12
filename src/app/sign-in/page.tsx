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
  const { error } = await searchParams;
  const linkError = error ? (ERROR_MESSAGES[error] ?? DEFAULT_LINK_ERROR) : undefined;
  console.log('error signin= ', error);

  return <SignInForm initialError={linkError} />;
}
