import Link from "next/link";
export function DemoNavigation() {
  return (
    <nav
      aria-label="Demo workspaces"
      className="flex flex-wrap items-center gap-x-5 gap-y-1 text-sm"
    >
      <Link
        className="inline-flex min-h-11 items-center hover:text-accent"
        href="/viewer"
      >
        Museum exhibition
      </Link>
      <Link
        className="inline-flex min-h-11 items-center hover:text-accent"
        href="/editor"
      >
        Museum editor
      </Link>
      <Link
        className="inline-flex min-h-11 items-center hover:text-accent"
        href="/plugin"
      >
        Hotel demo
      </Link>
      <form action="/api/demo/logout" method="post">
        <button className="min-h-11 text-muted hover:text-accent" type="submit">
          Logout
        </button>
      </form>
    </nav>
  );
}
