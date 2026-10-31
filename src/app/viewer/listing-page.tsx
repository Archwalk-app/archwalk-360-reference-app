import Link from "next/link";
import Image from "next/image";
import { ListingMedia } from "./listing-media";
import { MuseumHeader } from "./museum-header";
import { property, museumRooms } from "@/lib/property";

export function ViewerListingPage({
  embedUrl,
  startInTour = false,
}: {
  embedUrl?: string;
  startInTour?: boolean;
}) {
  return (
    <div className="museum-site">
      <a href="#main-content" className="museum-skip">
        Skip to exhibition
      </a>
      <MuseumHeader />
      <main id="main-content" className="museum-container">
        <section className="museum-intro" aria-labelledby="museum-title">
          <div>
            <p className="museum-eyebrow">
              Stockholm, Sweden <span aria-hidden> / </span> The house at
              Hamngatan 4
            </p>
            <h1 id="museum-title">
              Hallwyl Museum<span className="museum-title-dot">.</span>
            </h1>
            <h2 className="museum-deck">
              Explore the rooms. Then step inside.
            </h2>
          </div>
          <div className="museum-intro-note">
            <p>
              Browse photographs of Hallwyl Museum&apos;s historic interiors, or
              enter the interactive 360° tour to look around, move between rooms
              and discover the stories behind the artwork.
            </p>
          </div>
        </section>
        <ListingMedia
          key={String(startInTour)}
          embedUrl={embedUrl}
          initialMode={startInTour ? "tour" : "photos"}
        />
        <div className="museum-colophon">
          <span>Hamngatan 4 · Stockholm, Sweden</span>
          <span>Four rooms · Five panorama views</span>
          <Link href="/viewer/credits">
            Photographs: Jan Ainali / CC BY-SA 4.0 ↗
          </Link>
        </div>
        <section
          id="rooms"
          className="museum-rooms"
          aria-labelledby="rooms-title"
        >
          <div className="museum-section-heading">
            <div>
              <p className="museum-eyebrow">A closer look</p>
              <h2 id="rooms-title">Discover the rooms</h2>
            </div>
            <p>
              Gilded splendour, personal portraits and the quiet rituals of
              everyday life.
            </p>
          </div>
          <div className="museum-room-grid">
            {museumRooms.map((room, index) => (
              <article key={room.id} className="museum-room-card">
                <div className="museum-room-image">
                  <Image
                    src={`/museum/${room.id}.webp`}
                    alt={room.alt}
                    fill
                    sizes="(min-width: 1100px) 300px, (min-width: 640px) 45vw, 90vw"
                  />
                  <span>{String(index + 1).padStart(2, "0")}</span>
                </div>
                <p className="museum-eyebrow">{room.style}</p>
                <h3>{room.name}</h3>
                <p>{room.description}</p>
                <a
                  href={`https://hallwylskamuseet.se/en/visit-us/visit-at-your-own-pace/${room.source}/`}
                  target="_blank"
                  rel="noreferrer"
                  className="museum-text-link"
                >
                  Museum room notes <span aria-hidden>↗</span>
                </a>
              </article>
            ))}
          </div>
        </section>
        <section
          id="about"
          className="museum-about"
          aria-labelledby="about-title"
        >
          <div>
            <p className="museum-eyebrow">A home becomes a museum</p>
            <h2 id="about-title">
              A moment in time,
              <br />
              <em>kept for everyone.</em>
            </h2>
          </div>
          <div className="museum-about-copy">
            <p>
              Built between 1893 and 1898 for Wilhelmina and Walther von
              Hallwyl, the house was designed by Isak Gustaf Clason. Its richly
              varied historic interiors were created around Wilhelmina’s
              collections of art and antiques.
            </p>
            <p>
              The house and its contents were donated to the Swedish nation in
              1920. When the museum opened to the public in 1938, a private
              world became a shared cultural inheritance.
            </p>
            <a
              href="https://hallwylskamuseet.se/en/history-of-the-house/"
              target="_blank"
              rel="noreferrer"
              className="museum-text-link"
            >
              History of the house — official museum source ↗
            </a>
          </div>
          <dl className="museum-timeline">
            <div>
              <dt>1893–1898</dt>
              <dd>The house is built</dd>
            </div>
            <div>
              <dt>Isak Gustaf Clason</dt>
              <dd>Architect</dd>
            </div>
            <div>
              <dt>1938</dt>
              <dd>The museum opens</dd>
            </div>
          </dl>
        </section>
      </main>
      <footer className="museum-footer">
        <div className="museum-container">
          <div className="museum-footer-top">
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
                className="museum-brand-logo"
              />
            </Link>
            <p>
              Independent interactive demonstration powered by ArchWalk 360. Not
              an official Hallwyl Museum website.
            </p>
          </div>
          <div className="museum-footer-bottom">
            <span>{property.name} · A digital exhibition</span>
            <div>
              <Link href="/viewer/credits">Photo credits & sources</Link>
              <Link href="/editor">Curator demo workspace ↗</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
