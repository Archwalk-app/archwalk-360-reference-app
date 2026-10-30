import { HALLWYL_PUBLIC_ID } from "./museum.server";
import { viewerIframeSrc } from "./protocol";

export type ViewerListing = {
  status: "published";
  publicId: string;
  embedUrl: string;
};

// The published tour is public and was verified against its public payload.
// Visiting the exhibition must not require a private Partner API credential.
// The Creator resolves and verifies the connected Item ID separately, read-only.
export async function getViewerListing(): Promise<ViewerListing> {
  return {
    status: "published",
    publicId: HALLWYL_PUBLIC_ID,
    embedUrl: viewerIframeSrc(
      process.env.HALLWYL_VIEWER_ORIGIN?.trim() || "https://archwalk.app",
      HALLWYL_PUBLIC_ID,
    ),
  };
}
