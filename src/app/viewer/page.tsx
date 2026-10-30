import type { Metadata } from "next";
import { ViewerListingPage } from "./listing-page";
import { getViewerListing } from "@/lib/archwalk/listing";
export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Hallwyl Museum — Interactive 360° Experience | ArchWalk",
  description:
    "Explore four historic rooms of Stockholm’s Hallwyl Museum through authentic photography and five interactive panorama views. An independent ArchWalk 360 demonstration.",
  openGraph: {
    title: "Hallwyl Museum — A collector’s world",
    description:
      "Four historic rooms. Five panorama views. Explore an independent digital exhibition powered by ArchWalk 360.",
    images: [
      {
        url: "/museum/great-drawing-room.webp",
        width: 1600,
        height: 1100,
        alt: "The gilded Great Drawing Room at Hallwyl Museum",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Hallwyl Museum — Interactive 360° Experience",
    images: ["/museum/great-drawing-room.webp"],
  },
};
export default async function ViewerPage({
  searchParams,
}: PageProps<"/viewer">) {
  const listing = await getViewerListing();
  const params = await searchParams;
  return (
    <ViewerListingPage
      embedUrl={listing.embedUrl}
      startInTour={params.tour === "1"}
    />
  );
}
