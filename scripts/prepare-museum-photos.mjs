import { createRequire } from "node:module";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createHash } from "node:crypto";
import path from "node:path";
const require = createRequire(import.meta.url);
const sharp = require(
  require.resolve("sharp", { paths: [require.resolve("next/package.json")] }),
);
const root = process.argv[2];
if (!root) throw Error("Supply the prepared Hallwyl asset directory.");
const assets = JSON.parse(
  await readFile(path.join(root, "references/selected-assets.json"), "utf8"),
);
const views = [
  ["P01", "great-drawing-room", 180, 23],
  ["P03", "morning-room", 0, 12],
  ["P04", "smoking-room", 0, 18],
  ["P05", "ladies-drawing-room", 0, 18],
];
await mkdir("public/museum", { recursive: true });
const credits = [];
for (const [id, name, yawDegrees, pitchDegrees] of views) {
  const source = assets.find((a) => a.id === id);
  if (source.license !== "CC BY-SA 4.0") throw Error("Unverified licence");
  const original = await readFile(path.join(root, source.file));
  if (createHash("sha1").update(original).digest("hex") !== source.source_sha1)
    throw Error("Source checksum mismatch");
  const { data, info } = await sharp(original)
    .removeAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });
  const width = 1600,
    height = 1100,
    fov = 88,
    scale = Math.tan((fov * Math.PI) / 360),
    yaw = (yawDegrees * Math.PI) / 180,
    pitch = (pitchDegrees * Math.PI) / 180;
  const pixels = Buffer.alloc(width * height * 3);
  for (let y = 0; y < height; y++)
    for (let x = 0; x < width; x++) {
      const dx = ((2 * (x + 0.5)) / width - 1) * scale,
        dy = ((1 - (2 * (y + 0.5)) / height) * scale * height) / width;
      const py = dy * Math.cos(pitch) + Math.sin(pitch),
        pz = Math.cos(pitch) - dy * Math.sin(pitch);
      const px = dx * Math.cos(yaw) + pz * Math.sin(yaw),
        z = pz * Math.cos(yaw) - dx * Math.sin(yaw);
      const longitude = Math.atan2(px, z),
        latitude = Math.atan2(py, Math.hypot(px, z));
      const sx =
          ((longitude / (2 * Math.PI) + 0.5) * info.width + info.width) %
          info.width,
        sy = Math.max(
          0,
          Math.min(info.height - 1, (0.5 - latitude / Math.PI) * info.height),
        );
      const x0 = Math.floor(sx),
        y0 = Math.floor(sy),
        x1 = (x0 + 1) % info.width,
        y1 = Math.min(y0 + 1, info.height - 1),
        fx = sx - x0,
        fy = sy - y0;
      for (let c = 0; c < 3; c++) {
        const sample = (xx, yy) => data[(yy * info.width + xx) * 3 + c];
        pixels[(y * width + x) * 3 + c] =
          (sample(x0, y0) * (1 - fx) + sample(x1, y0) * fx) * (1 - fy) +
          (sample(x0, y1) * (1 - fx) + sample(x1, y1) * fx) * fy;
      }
    }
  const filename = name + ".webp";
  await sharp(pixels, { raw: { width, height, channels: 3 } })
    .webp({ quality: 84, effort: 6 })
    .toFile("public/museum/" + filename);
  credits.push({
    file: filename,
    photographer: source.photographer,
    source: source.source_page,
    original: source.original_url,
    originalSha1: source.source_sha1,
    license: source.license,
    licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
    modifications: `Rectilinear perspective extracted from the original 360° photograph (image-space yaw ${yawDegrees}°, pitch ${pitchDegrees}°, horizontal FOV ${fov}°); resized to ${width}×${height}; encoded as WebP; metadata removed. No generative imagery.`,
    verification:
      "Individual Commons licence wikitext and original SHA-1 checked against the prepared asset package, audited 27 October 2026.",
  });
  console.log(filename, (await readFile("public/museum/" + filename)).length);
}
await writeFile(
  "public/museum/credits.json",
  JSON.stringify(credits, null, 2) + "\n",
);
