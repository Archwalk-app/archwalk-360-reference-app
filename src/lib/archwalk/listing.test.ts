import assert from "node:assert/strict";
import { it } from "node:test";
import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { createElement } from "react";
import { getViewerListing } from "./listing";
import { ViewerListingPage } from "../../app/viewer/listing-page";
import { museumRooms } from "../property";
import { HALLWYL_PUBLIC_ID } from "./museum.server";
it("Hallwyl exhibition contains researched facts, four rooms and individually licensed local images", async () => {
  const html = renderToStaticMarkup(
    createElement(ViewerListingPage, {
      embedUrl: "https://archwalk.app/aw360/v/" + HALLWYL_PUBLIC_ID,
    }),
  );
  for (const text of [
    "Hallwyl Museum",
    "Hamngatan 4",
    "1893",
    "1898",
    "1938",
    "Isak Gustaf Clason",
    "Five panorama views",
    "Not an official Hallwyl Museum website.",
  ])
    assert.ok(html.includes(text), text);
  assert.doesNotMatch(html, /Sunset Villa|bedrooms|bathrooms|Reference Realty/);
  assert.equal(museumRooms.length, 4);
  assert.match(html, /Explore the rooms. Then step inside./);
  assert.match(html, /Step inside in 360°/);
  assert.doesNotMatch(html, /<iframe/);
  const deep = renderToStaticMarkup(
    createElement(ViewerListingPage, {
      embedUrl: "https://archwalk.app/aw360/v/" + HALLWYL_PUBLIC_ID,
      startInTour: true,
    }),
  );
  assert.match(deep, /<iframe/);
  const credits = JSON.parse(
    readFileSync(
      new URL("../../../public/museum/credits.json", import.meta.url),
      "utf8",
    ),
  );
  for (const room of museumRooms) {
    const item = credits.find(
      (x: { file: string }) => x.file === room.id + ".webp",
    );
    assert.equal(item.photographer, "Jan Ainali");
    assert.equal(item.license, "CC BY-SA 4.0");
    assert.match(item.source, /commons.wikimedia.org\/wiki\/File:/);
    assert.ok(
      readFileSync(
        new URL("../../../public/museum/" + item.file, import.meta.url),
      ).length < 300000,
    );
  }
  const listing = await getViewerListing();
  assert.equal(listing.publicId, HALLWYL_PUBLIC_ID);
  assert.match(
    listing.embedUrl,
    new RegExp("/aw360/v/" + HALLWYL_PUBLIC_ID + "$"),
  );
});
