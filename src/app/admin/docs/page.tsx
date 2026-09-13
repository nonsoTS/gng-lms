// No auth check needed in this file — it's nested under /admin, and
// admin/layout.tsx already redirects any non-admin session to "/" before
// this page ever renders. See CLAUDE.md's two-layer auth model: that
// layout check is what makes a page like this admin-only, the same way it
// already gates /admin/users and /admin/access-requests.
export default function AdminDocsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-step-2 font-semibold text-ink">Admin guide</h1>

      <article className="prose max-w-none">
        <h2>Courses, modules, lessons</h2>
        <p>
          Manage the content tree from <strong>Manage courses</strong>. A
          course has a title, slug, description, and a{" "}
          <strong>draft / published</strong> status — learners only ever see
          published courses. Deleting a course is a soft delete (it just
          stops appearing); deleting a module or lesson is permanent, which
          is why both ask you to type the title back to confirm.
        </p>
        <p>
          Inside a course, drag modules and lessons (mouse or keyboard) to
          reorder them — order is saved immediately. Each lesson also has
          its own draft/published status independent of the course&apos;s.
        </p>

        <h2>Lesson formats (assets)</h2>
        <p>
          Open <strong>Manage assets</strong> on a lesson row to reach its
          three format cards. The colored dots next to a lesson&apos;s title in
          the lesson list are a shortcut: sage means that format is{" "}
          <strong>ready</strong> (learners can see it), amber means it exists
          but is still <strong>draft</strong> (hidden from learners), and no
          dot means that format hasn&apos;t been set up at all.
        </p>
        <ul>
          <li>
            <strong>Video</strong> — paste a YouTube video ID or a full
            YouTube URL.
          </li>
          <li>
            <strong>Slides</strong> — drag and drop one or more images; they
            upload directly to storage (not through the app server), show as
            a thumbnail grid, and can be reordered or deleted individually.
          </li>
          <li>
            <strong>Text</strong> — write the lesson body in the rich text
            editor, and optionally attach a narrated audio file.
          </li>
        </ul>
        <p>
          A format only becomes visible to learners once you flip it from
          <strong> Draft</strong> to <strong>Ready</strong> on its card — this
          lets you prep content without it going live, and lets a lesson
          have some formats live and others still in progress at the same
          time.
        </p>

        <h2>Users</h2>
        <p>
          From <strong>Users</strong> you can invite someone by name and
          email (optionally checking &quot;Make admin&quot;), resend an
          invite that expired or never arrived, promote/demote between
          learner and admin, and activate/deactivate an account.
        </p>
        <p>A user&apos;s status means:</p>
        <ul>
          <li><strong>Active</strong> — has signed in at least once.</li>
          <li><strong>Invited</strong> — invite sent, not yet used, still within its 7-day window.</li>
          <li><strong>Expired</strong> — invite window passed without being used; resend it.</li>
          <li><strong>Deactivated</strong> — banned/deactivated; can no longer sign in.</li>
        </ul>
        <p>
          Two guardrails exist that you can&apos;t override from the UI: you
          can&apos;t demote the last remaining admin, and you can&apos;t
          deactivate your own account. Both are deliberate — they exist so
          the console can never lock every admin out at once.
        </p>

        <h2>Access requests</h2>
        <p>
          External sign-up requests (submitted from the marketing site, not
          from inside this app) land in <strong>Access requests</strong> as a
          pending queue. <strong>Approve</strong> creates the account and
          sends the same invite email the manual invite flow sends.{" "}
          <strong>Reject</strong> just clears the request — the applicant is
          not notified either way, so if you reject by mistake, ask them to
          submit the request again.
        </p>

        <h2>First admin / scripts</h2>
        <p>
          The admin console needs an admin session to reach it at all, so
          the very first admin account has to be created from the command
          line: <code>npm run create-invite -- you@example.com &quot;Your
          Name&quot; --admin</code>. There are equivalent{" "}
          <code>set-video-asset</code>, <code>set-slide-assets</code>, and{" "}
          <code>set-text-asset</code> scripts for seeding a lesson&apos;s
          content outside the UI, useful for bulk/initial content loads.
        </p>

        <h2>Known gaps worth knowing about</h2>
        <ul>
          <li>
            <strong>Email</strong> — a real sending domain is verified with
            Resend, so invite and magic-link emails reach real inboxes in
            production. Outside production (local dev), sending is still
            short-circuited to a console log instead — that&apos;s a
            deliberate safeguard against a dev machine emailing real users,
            not a leftover placeholder.
          </li>
          <li>
            <strong>Turnstile (bot protection on access requests)</strong> — a
            real Cloudflare Turnstile site is configured, so submissions are
            genuinely verified now, on top of the request-rate limit (20 per
            5 minutes) that always applied.
          </li>
          <li>
            <strong>Donations</strong> — Paystack is a plain external link,
            shown only once its URL is configured. No payment data ever
            touches this app.
          </li>
        </ul>

        <h2>Marketing-site integration notes</h2>
        <p>
          The marketing site calls <code>POST /api/access-requests</code>{" "}
          directly from the visitor&apos;s browser, authenticated with a
          bearer shared secret rather than a session cookie. That route
          returns permissive CORS headers (any origin) by design — the
          secret and the rate limit are the real guards, not same-origin
          restriction — so the marketing site can move between preview and
          production domains without this app needing to know about each
          one. The marketing site's contact form now renders a real
          Turnstile widget and sends the resulting token through. Two
          things worth remembering if that form ever moves domains or gets
          rebuilt: Turnstile site keys are locked to specific hostnames in
          the Cloudflare dashboard (a preview/staging domain not on that
          list will silently fail to render), and a single-page app should
          render the widget explicitly (on mount) rather than relying on
          its implicit auto-render, which only scans the page once at
          initial script load and won't pick up a form that mounts later.
        </p>
      </article>
    </div>
  );
}
