import Link from "next/link";

const LINKS = [
  { href: "/admin/courses", label: "Manage courses", description: "Modules, lessons, and formats" },
  { href: "/admin/users", label: "Users", description: "Invite, promote, deactivate" },
  { href: "/admin/access-requests", label: "Access requests", description: "Review pending sign-up requests" },
  { href: "/admin/docs", label: "Docs", description: "Admin guide and troubleshooting" },
];

export default function AdminPage() {
  return (
    <div className="space-y-4">
      <h1 className="text-step-2 font-semibold text-ink">Admin</h1>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-card border border-line bg-surface p-4 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <p className="text-step-0 font-medium text-ink">{link.label}</p>
            <p className="mt-1 text-step-n1 text-muted">{link.description}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
