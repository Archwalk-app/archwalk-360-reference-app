import Image from "next/image";
import Link from "next/link";
export function MuseumHeader() {
  return (
    <header className="museum-header">
      <div className="museum-container museum-header-inner">
        <Link
          href="/viewer"
          className="museum-wordmark"
          aria-label="ArchWalk demo home"
        >
          <Image
            src="/brand/archwalk-lockup-light.png"
            alt="ArchWalk"
            width={868}
            height={168}
            priority
            className="museum-brand-logo"
          />
        </Link>
        <span className="museum-header-note">
          Interactive 360° experiences
        </span>
        <nav aria-label="Exhibition navigation">
          <Link href="/viewer#rooms">The rooms</Link>
          <Link href="/viewer#about">The story</Link>
          <Link href="/viewer/credits">Credits</Link>
          <Link href="/plugin">Hotel demo</Link>
          <a
            href="https://archwalk.app"
            className="museum-home-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            Visit ArchWalk <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
