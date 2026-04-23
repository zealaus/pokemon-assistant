import fs from "fs/promises";
import path from "path";

const rosterPath = path.resolve("src/data/champions_roster_full.json");
const outputPath = path.resolve("src/data/champions_sprites.json");

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

function slugify(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildAliases(name, existingAliases = []) {
  const aliases = new Set((existingAliases || []).map((a) => normalizeText(a)));
  const base = normalizeText(name);
  if (base) aliases.add(base);

  const shortMap = {
    charizard: ["zard"],
    garchomp: ["chomp"],
    gengar: ["gar"],
    mimikyu: ["mimi"],
    dragonite: ["dnite"],
    corviknight: ["corvi"],
    archaludon: ["arch"],
    skeledirge: ["dirge", "fire croc"],
    greninja: ["ninja"],
  };

  for (const alias of shortMap[base] || []) {
    aliases.add(normalizeText(alias));
  }

  return [...aliases].filter(Boolean);
}

async function main() {
  const raw = await fs.readFile(rosterPath, "utf8");
  const roster = JSON.parse(raw);

  const entries = (roster.entries || [])
    .filter((pokemon) => !pokemon.isMega)
    .map((pokemon) => {
      const name = pokemon.name;
      const form = pokemon.form || null;
      const slug = pokemon.slug || slugify(form ? `${name}-${form}` : name);

      return {
        name,
        form,
        slug,
        aliases: buildAliases(name, pokemon.aliases || []),
        sprite: `/sprites/${slug}.png`,
      };
    });

  const unique = [];
  const seen = new Set();

  for (const entry of entries) {
    const key = entry.slug;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(entry);
  }

  await fs.writeFile(outputPath, JSON.stringify(unique, null, 2), "utf8");
  console.log(`Saved ${unique.length} sprite entries to src/data/champions_sprites.json`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});