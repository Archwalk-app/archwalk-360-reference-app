import Link from "next/link";
export function MuseumHeader() {
  return (
    <header className="museum-header">
      <div className="museum-container museum-header-inner">
        <Link
          href="/viewer"
          className="museum-wordmark"
          aria-label="ArchWalk — Hallwyl Museum demo"
        >
          ArchWalk
        </Link>
        <span className="museum-header-note">
          Interactive 360° experiences
        </span>
        <nav aria-label="Exhibition navigation">
          <Link href="/viewer#rooms">The rooms</Link>
          <Link href="/viewer#about">The story</Link>
          <Link href="/viewer/credits">Credits</Link>
          <Link href="/plugin">Hotel demo</Link>
        </nav>
      </div>
    </header>
  );
}
