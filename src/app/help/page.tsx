import Link from "next/link";
import { requireSession } from "@/lib/require-session";

export default async function HelpPage() {
  await requireSession();

  return (
    <main className="mx-auto max-w-3xl p-6 sm:p-8">
      <div className="mb-6 flex items-baseline justify-between gap-4">
        <h1 className="text-step-3 font-serif font-semibold text-ink">Help</h1>
        <Link href="/courses" className="text-step-0 text-primary hover:underline">
          ← Back to courses
        </Link>
      </div>

      <article className="prose max-w-none">
        <h2>Signing in</h2>
        <p>
          There&apos;s no password. You&apos;ll get either a one-time invite link
          (for a brand-new account) or a magic link (for signing back in) sent
          to your email — open it and you&apos;re in. Each link works once and
          expires after a while, so request a fresh one if yours has gone
          stale rather than trying an old email.
        </p>
        <p>
          There&apos;s no self-serve sign-up. If you don&apos;t have an account
          yet, use the &quot;Request access&quot; option wherever you found this
          site, or ask an administrator to invite you directly.
        </p>

        <h2>Finding a course</h2>
        <p>
          Your course list lives at <Link href="/courses">Courses</Link>. Each
          card shows how many lessons you&apos;ve completed and its border
          color tells you the state at a glance: no color means not started
          yet, a highlighted border means in progress, and a &quot;Complete&quot;
          badge means you&apos;ve finished every lesson.
        </p>

        <h2>Taking a lesson</h2>
        <p>
          A lesson can offer up to three interchangeable formats — you&apos;ll
          only see the ones an admin has actually published for that lesson:
        </p>
        <ul>
          <li><strong>Watch</strong> — a video.</li>
          <li><strong>Slides</strong> — a set of slide images you page through.</li>
          <li><strong>Read &amp; Listen</strong> — an article, optionally with a
            narrated audio track alongside it.</li>
        </ul>
        <p>
          Switch between formats with the tabs above the lesson content
          (click, or use the arrow keys once a tab is focused). Whichever
          format you pick is remembered as your preference and offered first
          the next time you open a lesson that has it.
        </p>

        <h2>Progress</h2>
        <p>
          Each format keeps track of where you left off on its own — your
          video position, how far you&apos;ve paged through slides, and your
          scroll position/listening time in an article are all remembered
          separately. Once a lesson is marked complete, it stays complete
          even if you go back and look at it in a different format
          afterward.
        </p>

        <h2>The audio player</h2>
        <p>
          When you&apos;re listening to a lesson&apos;s narration, playback keeps
          going as you navigate to other pages — it only stops if you
          actually reload the page. Turn on <strong>Autoplay next</strong> next
          to the player controls to have it move to the next lesson
          automatically once the current one finishes, or use the{" "}
          <strong>Next</strong> button to jump ahead yourself.
        </p>

        <h2>Supporting the project</h2>
        <p>
          If a donation banner appears, it&apos;s optional — dismissing it hides
          it for a couple of weeks.
        </p>

        <h2>Something not working?</h2>
        <ul>
          <li>
            <strong>Invite or magic link says it&apos;s invalid or expired</strong> —
            these are single-use and time-limited. Ask an administrator to
            send you a new one.
          </li>
          <li>
            <strong>A lesson looks empty or is missing a format you expected</strong> —
            that format likely hasn&apos;t been published for that lesson yet;
            check back later or ask an admin.
          </li>
        </ul>
      </article>
    </main>
  );
}
