import Image from "next/image";
import Link from "next/link";
export function MuseumHeader() {
  return (
    <header className="museum-header">
      <div className="museum-container museum-header-inner">
        <a
          href="https://archwalk.app"
          className="museum-wordmark"
          aria-label="Visit ArchWalk main website"
        >
          <Image
            src="/brand/archwalk-lockup-light.png"
            alt="ArchWalk"
            width={868}
            height={168}
            priority
            className="museum-brand-logo"
          />
        </a>
        <span className="museum-header-note">
          Interactive 360° experiences
        </span>
        <nav aria-label="Exhibition navigation">
          <Link href="/viewer#rooms">The rooms</Link>
          <Link href="/viewer#about">The story</Link>
          <Link href="/viewer/credits">Credits</Link>
          <Link href="/plugin">Hotel demo</Link>
          <a href="https://archwalk.app" className="museum-home-link">
            Back to ArchWalk <span aria-hidden="true">↗</span>
          </a>
        </nav>
      </div>
    </header>
  );
}
