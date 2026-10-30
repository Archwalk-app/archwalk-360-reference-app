"use client";
import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ViewerEmbed } from "./viewer-embed";
import { museumRooms } from "@/lib/property";

export function ListingMedia({
  embedUrl,
  initialMode = "photos",
}: {
  embedUrl?: string;
  initialMode?: "photos" | "tour";
}) {
  const [mode, setMode] = useState<"photos" | "tour">(
    embedUrl ? initialMode : "photos",
  );
  const [selected, setSelected] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const workspace = useRef<HTMLDivElement>(null);
  const invitation = useRef<HTMLButtonElement>(null);
  const back = useRef<HTMLButtonElement>(null);
  const interacted = useRef(false);
  const instructionsSeen = useRef(false);
  function enterTour() {
    if (!embedUrl) return;
    interacted.current = true;
    setMode("tour");
  }
  function backToPhotos() {
    interacted.current = true;
    setShowInstructions(false);
    setMode("photos");
  }
  useEffect(() => {
    if (mode === "photos" && !interacted.current) return;
    const frame = requestAnimationFrame(() => {
      if (mode === "tour" && !instructionsSeen.current) {
        instructionsSeen.current = true;
        try {
          if (!sessionStorage.getItem("hallwyl-tour-instructions-seen")) {
            setShowInstructions(true);
            sessionStorage.setItem("hallwyl-tour-instructions-seen", "1");
          }
        } catch {
          // Storage-restricted browsers still show the hint only once per mount.
          setShowInstructions(true);
        }
      }
      if (interacted.current) {
        (mode === "tour" ? back : invitation).current?.focus({
          preventScroll: true,
        });
      }
      workspace.current?.scrollIntoView({
        block: "start",
        behavior:
          interacted.current &&
          !matchMedia("(prefers-reduced-motion: reduce)").matches
            ? "smooth"
            : "instant",
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [mode]);
  const room = museumRooms[selected];
  return (
    <section
      id="museum-media"
      aria-label="Museum photographs and 360° tour"
      className="museum-media"
      data-mode={mode}
    >
      <div ref={workspace} className="museum-media-workspace">
        <div className="museum-media-toolbar">
          <div
            className="museum-media-toggle"
            role="group"
            aria-label="Choose museum media"
          >
            <button
              type="button"
              aria-pressed={mode === "photos"}
              aria-controls="listing-media"
              onClick={backToPhotos}
            >
              Photos
            </button>
            <button
              type="button"
              disabled={!embedUrl}
              aria-pressed={mode === "tour"}
              aria-controls="listing-media"
              onClick={enterTour}
            >
              360° Tour <span aria-hidden>↗</span>
            </button>
          </div>
          {mode === "photos" ? (
            <p>An invitation to look closer</p>
          ) : (
            <button
              ref={back}
              className="museum-back-to-photos"
              type="button"
              onClick={backToPhotos}
            >
              <span aria-hidden>←</span> Back to photos
            </button>
          )}
        </div>
        {mode === "tour" && showInstructions && (
          <div className="museum-tour-instructions" role="status">
            <p>
              Drag to look around · Select a room to move · Explore the floor
              plan.
            </p>
            <button
              type="button"
              aria-label="Dismiss tour instructions"
              onClick={() => setShowInstructions(false)}
            >
              Got it <span aria-hidden>×</span>
            </button>
          </div>
        )}
        <div id="listing-media" className="museum-media-frame">
          {mode === "tour" && embedUrl ? (
            <ViewerEmbed src={embedUrl} />
          ) : (
            <div
              className="museum-gallery"
              aria-label="Hallwyl Museum photo gallery"
            >
              <figure className="museum-feature-photo">
                <Image
                  src={`/museum/${room.id}.webp`}
                  alt={room.alt}
                  fill
                  sizes="(min-width: 1400px) 900px, (min-width: 768px) 68vw, 100vw"
                  loading="eager"
                  fetchPriority={selected === 0 ? "high" : "auto"}
                />
                <figcaption>
                  <span>Room {String(selected + 1).padStart(2, "0")} / 04</span>
                  <strong>{room.name}</strong>
                </figcaption>
              </figure>
              <div
                className="museum-photo-rail"
                role="group"
                aria-label="Choose a room photograph"
              >
                {museumRooms.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    aria-label={`View ${item.name} photograph`}
                    aria-pressed={selected === index}
                    onClick={() => setSelected(index)}
                  >
                    <span className="museum-thumb-image">
                      <Image
                        src={`/museum/${item.id}.webp`}
                        alt=""
                        fill
                        sizes="(min-width: 768px) 200px, 25vw"
                      />
                    </span>
                    <span className="museum-thumb-caption">
                      <span>{String(index + 1).padStart(2, "0")}</span>
                      {item.name}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
        {mode === "photos" && embedUrl && (
          <div className="museum-tour-invitation">
            <p>There&apos;s more to explore beyond this photograph.</p>
            <button
              ref={invitation}
              type="button"
              className="museum-primary"
              onClick={enterTour}
            >
              Enter interactive 360° tour <span aria-hidden>→</span>
            </button>
          </div>
        )}
        {!embedUrl ? (
          <p role="status" className="museum-setup-note">
            The tour connection needs setup. No Experience has been created or
            changed.
          </p>
        ) : null}
      </div>
    </section>
  );
}
