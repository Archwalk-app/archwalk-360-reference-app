"use client";
import Image from "next/image";
import { useState } from "react";
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
  const room = museumRooms[selected];
  return (
    <section
      id="museum-media"
      aria-label="Museum photographs and 360° tour"
      className="museum-media"
    >
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
            onClick={() => setMode("photos")}
          >
            Photos
          </button>
          <button
            type="button"
            disabled={!embedUrl}
            aria-pressed={mode === "tour"}
            aria-controls="listing-media"
            onClick={() => setMode("tour")}
          >
            360° Tour <span aria-hidden>↗</span>
          </button>
        </div>
        <p>
          {mode === "photos"
            ? "An invitation to look closer"
            : "Five views. Four rooms. Your own pace."}
        </p>
      </div>
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
      {!embedUrl ? (
        <p role="status" className="museum-setup-note">
          The tour connection needs setup. No Experience has been created or
          changed.
        </p>
      ) : null}
    </section>
  );
}
