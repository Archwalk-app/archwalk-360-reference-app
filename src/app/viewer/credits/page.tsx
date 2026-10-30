import type { Metadata } from "next";
import Link from "next/link";
import { MuseumHeader } from "../museum-header";
import credits from "../../../../public/museum/credits.json";
export const metadata: Metadata = {
  title: "Photograph credits & sources — Hallwyl Museum | ArchWalk",
};
export default function CreditsPage() {
  return (
    <div className="museum-site">
      <MuseumHeader />
      <main className="museum-container museum-credits">
        <p className="museum-eyebrow">Photography & provenance</p>
        <h1>Credit where it belongs.</h1>
        <p>
          All four room photographs are real photographs by Jan Ainali,
          originally published on Wikimedia Commons under{" "}
          <a href="https://creativecommons.org/licenses/by-sa/4.0/">
            Creative Commons Attribution–ShareAlike 4.0 International
          </a>
          . Our perspective extractions and WebP derivatives are distributed
          under the same licence. That licence applies to these photographs, not
          to the application code.
        </p>
        <ul>
          {credits.map((item) => (
            <li key={item.file}>
              <strong>
                {item.file.replaceAll("-", " ").replace(".webp", "")}
              </strong>
              <br />
              Jan Ainali ·{" "}
              <a href={item.source}>
                Original Commons file & individual licence
              </a>{" "}
              · <a href={item.licenseUrl}>{item.license}</a>
              <br />
              {item.modifications}
            </li>
          ))}
        </ul>
        <p>
          Prepared source-package licence records were audited on 27 October
          2026. The original files’ SHA-1 checksums were verified before
          processing. Complete file-by-file provenance is available in the{" "}
          <a href="/museum/credits.json">machine-readable credits</a>. No
          AI-generated imagery or unrelated stock interiors are used.
        </p>
        <p>
          Historical and room descriptions are based on the museum’s{" "}
          <a href="https://hallwylskamuseet.se/en/history-of-the-house/">
            History of the House
          </a>{" "}
          and{" "}
          <a href="https://hallwylskamuseet.se/en/visit-us/visit-at-your-own-pace/">
            first-floor room guide
          </a>
          . Photographs show the rooms as photographed in 2016, rather than
          guaranteeing their present-day arrangement.
        </p>
        <p>
          Independent interactive demonstration powered by ArchWalk 360. Not an
          official Hallwyl Museum website.
        </p>
        <Link href="/viewer">← Back to the exhibition</Link>
      </main>
    </div>
  );
}
