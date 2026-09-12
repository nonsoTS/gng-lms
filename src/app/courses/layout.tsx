import { env } from "@/env";
import { DonationPrompt } from "@/components/donation-prompt";

export default function CoursesLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {env.NEXT_PUBLIC_PAYSTACK_DONATION_URL && (
        <DonationPrompt donationUrl={env.NEXT_PUBLIC_PAYSTACK_DONATION_URL} />
      )}
      {children}
    </>
  );
}
