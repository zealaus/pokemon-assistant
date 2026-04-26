import fs from "fs/promises";

const MOVES_URL = "https://pokebase.app/pokemon-champions/moves";
const OUTPUT_PATH = "src/data/champions_moves.json";

const TYPES = [
  "Normal",
  "Fire",
  "Water",
  "Electric",
  "Grass",
  "Ice",
  "Fighting",
  "Poison",
  "Ground",
  "Flying",
  "Psychic",
  "Bug",
  "Rock",
  "Ghost",
  "Dragon",
  "Dark",
  "Steel",
  "Fairy",
];

function cleanText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function toNumber(value) {
  const text = String(value || "").replace("%", "").trim();
  if (!text || text === "-" || text === "--") return null;

  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTypeFromAltBeforeName(htmlBeforeMove) {
  const reversed = [...htmlBeforeMove.matchAll(/alt="([^"]+)"/g)].reverse();

  for (const match of reversed) {
    const possibleType = cleanText(match[1]);

    if (TYPES.includes(possibleType)) {
      return possibleType;
    }
  }

  return null;
}

function parseMoves(html) {
  const moves = [];

  const linkRegex =
    /<a[^>]+href="\/pokemon-champions\/moves\/([^"]+)"[^>]*>(.*?)<\/a>/g;

  const links = [...html.matchAll(linkRegex)];

  for (let index = 0; index < links.length; index++) {
    const match = links[index];

    const slug = match[1];
    const name = cleanText(match[2].replace(/<[^>]+>/g, ""));

    if (!name || !slug) continue;

    const start = match.index;
    const end = links[index + 1]?.index ?? html.length;

    const before = html.slice(Math.max(0, start - 500), start);
    const rowHtml = html.slice(start, end);

    const type = getTypeFromAltBeforeName(before);

    const text = cleanText(rowHtml.replace(/<[^>]+>/g, " "));
    const percentMatch = text.match(/(\d+(?:\.\d+)?)%/);
    const usagePercent = percentMatch ? Number(percentMatch[1]) : null;

    let remaining = text;

    if (percentMatch) {
      remaining = remaining.slice(percentMatch.index + percentMatch[0].length);
    }

    const statMatch = remaining.match(/(.+?)(--|-|\d+)\s*(\d+%|-)?\s*(\d+)$/);

    let description = remaining;
    let power = null;
    let accuracy = null;
    let pp = null;

    if (statMatch) {
      description = cleanText(statMatch[1]);
      power = toNumber(statMatch[2]);
      accuracy = toNumber(statMatch[3]);
      pp = toNumber(statMatch[4]);
    }

    moves.push({
      name,
      slug,
      type,
      usagePercent,
      description,
      power,
      accuracy,
      pp,
      source: MOVES_URL,
    });
  }

  const seen = new Set();

  return moves.filter((move) => {
    const key = move.slug;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

async function main() {
  const response = await fetch(MOVES_URL);

  if (!response.ok) {
    throw new Error(`Failed to fetch moves page: ${response.status}`);
  }

  const html = await response.text();
  const moves = parseMoves(html);

  await fs.mkdir("src/data", { recursive: true });
  await fs.writeFile(OUTPUT_PATH, JSON.stringify(moves, null, 2), "utf8");

  console.log(`Saved ${moves.length} moves to ${OUTPUT_PATH}`);

  const missingTypes = moves.filter((move) => !move.type).length;
  const missingPowerAndStatus = moves.filter(
    (move) => move.power === null && !move.description
  ).length;

  console.log(`Missing type: ${missingTypes}`);
  console.log(`Potential parse misses: ${missingPowerAndStatus}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});