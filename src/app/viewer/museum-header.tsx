import Link from "next/link";
export function MuseumHeader() {
  return (
    <header className="museum-header">
      <div className="museum-container museum-header-inner">
        <Link
          href="/viewer"
          className="museum-wordmark"
          aria-label="Rooms in Time, Hallwyl Museum showcase"
        >
          Rooms<span>in Time</span>
        </Link>
        <span className="museum-header-note">
          Independent cultural journeys
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
