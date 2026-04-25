import fs from "fs/promises";
import path from "path";

const rosterPath = path.resolve("src/data/champions_roster_full.json");
const spritePath = path.resolve("src/data/champions_sprites.json");
const outputPath = path.resolve("src/data/champions_pokemon.json");

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

async function main() {
  const rosterRaw = await fs.readFile(rosterPath, "utf8");
  const spriteRaw = await fs.readFile(spritePath, "utf8");

  const rosterJson = JSON.parse(rosterRaw);
  const spriteJson = JSON.parse(spriteRaw);

  const roster = rosterJson.entries || [];
  const sprites = spriteJson || [];

  const merged = roster
    .filter((pokemon) => !pokemon.isMega)
    .map((pokemon) => {
      const spriteMatch = sprites.find((sprite) => {
        return (
          normalizeText(sprite.slug) === normalizeText(pokemon.slug) ||
          normalizeText(sprite.name) === normalizeText(pokemon.name)
        );
      });

      return {
        ...pokemon,
        sprite: spriteMatch?.sprite || "",
        aliases: [...new Set([...(pokemon.aliases || []), ...(spriteMatch?.aliases || [])])],
      };
    });

  await fs.writeFile(outputPath, JSON.stringify(merged, null, 2), "utf8");

  console.log(`Saved ${merged.length} merged Pokémon entries to src/data/champions_pokemon.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});