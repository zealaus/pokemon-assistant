import fs from "fs/promises";
import path from "path";

const ROSTER_PATH = path.resolve("src/data/champions_roster_full.json");
const OUTPUT_DIR = path.resolve("public/sprites");

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function getDex(entry) {
  const possible = [
    entry.dex,
    entry.ndex,
    entry.nationalDex,
    entry.number,
    entry.id,
  ];

  for (const val of possible) {
    if (!val) continue;
    const digits = String(val).match(/\d+/)?.[0];
    if (digits) return digits.padStart(4, "0");
  }

  return null;
}

function getFormSuffix(form) {
  if (!form) return "";

  const f = form.toLowerCase();

  if (f.includes("alola")) return "-Alola";
  if (f.includes("galar")) return "-Galar";
  if (f.includes("hisui")) return "-Hisui";
  if (f.includes("white-striped")) return "-White-Striped";
  if (f.includes("eternal")) return "-Eternal";
  if (f.includes("combat")) return "-Paldea Combat";
  if (f.includes("blaze")) return "-Paldea Blaze";
  if (f.includes("aqua")) return "-Paldea Aqua";

  return "";
}

function buildSpriteUrl(dex, formSuffix) {
  const fileName = `Menu CP ${dex}${formSuffix}.png`;

  // Bulbagarden stores images with hashed folders
  // we use "Special:FilePath" which redirects directly to the image

  return `https://archives.bulbagarden.net/wiki/Special:FilePath/${encodeURIComponent(fileName)}`;
}

async function download(url) {
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0" },
  });

  if (!res.ok) return null;

  const buffer = await res.arrayBuffer();
  return Buffer.from(buffer);
}

async function main() {
  await fs.mkdir(OUTPUT_DIR, { recursive: true });

  const raw = await fs.readFile(ROSTER_PATH, "utf8");
  const rosterJson = JSON.parse(raw);
  const roster = rosterJson.entries || [];

  let downloaded = 0;
  let skipped = 0;
  const missing = [];

  for (const entry of roster) {
    if (entry.isMega) continue;

    const dex = getDex(entry);
    if (!dex) {
      missing.push({ name: entry.name, reason: "No dex" });
      continue;
    }

    const formSuffix = getFormSuffix(entry.form);
    const url = buildSpriteUrl(dex, formSuffix);
    const slug = entry.slug || slugify(entry.name);

    const outputPath = path.join(OUTPUT_DIR, `${slug}.png`);

    try {
      await fs.access(outputPath);
      skipped++;
      continue;
    } catch {}

    console.log(`Downloading ${slug}...`);

    const file = await download(url);

    if (!file) {
      missing.push({ name: entry.name, url });
      continue;
    }

    await fs.writeFile(outputPath, file);
    downloaded++;
  }

  console.log(`\nDone`);
  console.log(`Downloaded: ${downloaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Missing: ${missing.length}`);

  await fs.writeFile(
    "src/data/download_report.json",
    JSON.stringify({ downloaded, skipped, missing }, null, 2)
  );
}

main().catch(console.error);