import { Resend } from "resend";
import { env } from "@/env";

const resend = new Resend(env.RESEND_API_KEY);

async function send(to: string, subject: string, html: string, url: string) {
  if (env.NODE_ENV !== "production") {
    console.log(`[email:dev] to=${to} subject="${subject}" url=${url}`);
    return;
  }

  await resend.emails.send({
    from: env.EMAIL_FROM,
    to,
    subject,
    html,
  });
}

export async function sendMagicLinkEmail(to: string, url: string) {
  await send(
    to,
    "Your Growth and Giggles sign-in link",
    `<p>Click below to sign in. This link expires shortly and can only be used once.</p><p><a href="${url}">${url}</a></p>`,
    url,
  );
}

export async function sendInviteEmail(to: string, url: string) {
  await send(
    to,
    "You're invited to Growth and Giggles",
    `<p>You've been invited to join Growth and Giggles. Click below to activate your account. This link is valid for 7 days and can only be used once.</p><p><a href="${url}">${url}</a></p>`,
    url,
  );
}
