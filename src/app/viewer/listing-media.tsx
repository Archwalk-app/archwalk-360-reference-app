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
  const tourAction = useRef<HTMLButtonElement>(null);
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
        (mode === "tour" ? tourAction : back).current?.focus({
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
            role="tablist"
            aria-label="Choose museum media"
            onKeyDown={(event) => {
              if (
                !["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)
              )
                return;
              event.preventDefault();
              const target =
                event.key === "Home" || !embedUrl
                  ? back
                  : event.key === "End"
                    ? tourAction
                    : event.target === back.current
                      ? tourAction
                      : back;
              target.current?.focus();
            }}
          >
            <button
              ref={back}
              className="museum-photo-choice"
              type="button"
              role="tab"
              id="museum-photos-tab"
              aria-selected={mode === "photos"}
              tabIndex={mode === "photos" ? 0 : -1}
              aria-controls="museum-photos-panel"
              onClick={backToPhotos}
            >
              <svg
                aria-hidden="true"
                focusable="false"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <rect x="3" y="4" width="18" height="16" rx="2" />
                <circle cx="8" cy="9" r="1.5" />
                <path d="m3 16 5-4 4 3 4-5 5 6" />
              </svg>
              <span>Photos</span>
            </button>
            <button
              type="button"
              ref={tourAction}
              className="museum-tour-action"
              disabled={!embedUrl}
              role="tab"
              id="museum-tour-tab"
              aria-selected={mode === "tour"}
              tabIndex={mode === "tour" ? 0 : -1}
              aria-controls="museum-tour-panel"
              onClick={enterTour}
            >
              <svg
                aria-hidden="true"
                focusable="false"
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.6"
              >
                <circle cx="12" cy="12" r="9" />
                <ellipse cx="12" cy="12" rx="4" ry="9" />
                <path d="M3 12h18" />
              </svg>
              <span>Interactive 360° Tour</span>
            </button>
          </div>
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
          <div
            id="museum-tour-panel"
            role="tabpanel"
            aria-labelledby="museum-tour-tab"
            hidden={mode !== "tour"}
          >
            {mode === "tour" && embedUrl ? (
              <ViewerEmbed src={embedUrl} />
            ) : null}
          </div>
          <div
            id="museum-photos-panel"
            role="tabpanel"
            aria-labelledby="museum-photos-tab"
            hidden={mode !== "photos"}
            tabIndex={0}
          >
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
          </div>
        </div>
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
