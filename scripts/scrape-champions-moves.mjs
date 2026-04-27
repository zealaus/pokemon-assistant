import fs from "fs/promises";

const BASE_MOVES_URL = "https://pokebase.app/pokemon-champions/moves";
const OUTPUT_PATH = "src/data/champions_moves.json";
const TOTAL_PAGES = 10;

const TYPES = [
  "Normal","Fire","Water","Electric","Grass","Ice","Fighting","Poison",
  "Ground","Flying","Psychic","Bug","Rock","Ghost","Dragon","Dark","Steel","Fairy"
];

function cleanText(value) {
  return String(value || "")
    .replace(/&nbsp;/g, " ")
    .replace(/&#x27;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, "&")
    .replace(/PokÃ©mon/g, "Pokémon")
    .replace(/\s+/g, " ")
    .trim();
}

function stripTags(value) {
  return cleanText(String(value || "").replace(/<[^>]*>/g, " "));
}

function toNumber(value) {
  const text = String(value || "").replace("%", "").trim();
  if (!text || text === "-" || text === "--") return null;
  const parsed = Number(text);
  return Number.isFinite(parsed) ? parsed : null;
}

function getTypeBeforeMoveLink(html, startIndex) {
  const before = html.slice(Math.max(0, startIndex - 700), startIndex);
  const matches = [...before.matchAll(/alt="([^"]+)"/g)].reverse();

  for (const match of matches) {
    const possibleType = cleanText(match[1]);
    if (TYPES.includes(possibleType)) return possibleType;
  }

  return null;
}

function parseStatsFromText(text) {
  const compact = cleanText(text);

  const standard = compact.match(/^(.*?)(\d+)\s+(\d+)%\s*(\d+)$/);
  if (standard) {
    return {
      description: cleanText(standard[1]),
      power: toNumber(standard[2]),
      accuracy: toNumber(standard[3]),
      pp: toNumber(standard[4]),
    };
  }

  const noAccuracy = compact.match(/^(.*?)(\d+)-(\d+)$/);
  if (noAccuracy) {
    return {
      description: cleanText(noAccuracy[1]),
      power: toNumber(noAccuracy[2]),
      accuracy: null,
      pp: toNumber(noAccuracy[3]),
    };
  }

  const noPower = compact.match(/^(.*?)-(\d+)%\s*(\d+)$/);
  if (noPower) {
    return {
      description: cleanText(noPower[1]),
      power: null,
      accuracy: toNumber(noPower[2]),
      pp: toNumber(noPower[3]),
    };
  }

  const status = compact.match(/^(.*?)--(\d+)$/);
  if (status) {
    return {
      description: cleanText(status[1]),
      power: null,
      accuracy: null,
      pp: toNumber(status[2]),
    };
  }

  return {
    description: compact,
    power: null,
    accuracy: null,
    pp: null,
  };
}

function parseMoves(html, pageUrl) {
  const moveLinkRegex =
    /<a[^>]+href="\/pokemon-champions\/moves\/([^"]+)"[^>]*>(.*?)<\/a>/g;

  const links = [...html.matchAll(moveLinkRegex)];
  const moves = [];

  console.log(`Found move links: ${links.length}`);

  for (let i = 0; i < links.length; i++) {
    const current = links[i];
    const next = links[i + 1];

    const slug = current[1];
    const name = stripTags(current[2]);
    if (!slug || !name) continue;

    const start = current.index;
    const end = next?.index ?? html.length;

    const rowChunk = html.slice(start, end);
    const type = getTypeBeforeMoveLink(html, start);

    let rowText = stripTags(rowChunk);
    rowText = rowText.replace(name, "").trim();

    const usageMatch = rowText.match(/(\d+(?:\.\d+)?)%/);
    const usagePercent = usageMatch ? Number(usageMatch[1]) : null;

    if (usageMatch) {
      rowText = rowText.slice(usageMatch.index + usageMatch[0].length).trim();
    }

    const parsed = parseStatsFromText(rowText);

    moves.push({
      name,
      slug,
      type,
      usagePercent,
      description: parsed.description,
      power: parsed.power,
      accuracy: parsed.accuracy,
      pp: parsed.pp,
      source: pageUrl,
    });
  }

  return moves;
}

async function fetchPage(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Failed ${response.status}`);
  return response.text();
}

async function main() {
  const allMoves = [];

  for (let page = 1; page <= TOTAL_PAGES; page++) {
    const pageUrl =
      page === 1 ? BASE_MOVES_URL : `${BASE_MOVES_URL}?page=${page}`;

    console.log(`Fetching page ${page}`);
    const html = await fetchPage(pageUrl);

    const moves = parseMoves(html, pageUrl);
    console.log(`Parsed page ${page}: ${moves.length}`);

    allMoves.push(...moves);
  }

  const seen = new Set();
  const uniqueMoves = allMoves.filter((move) => {
    if (seen.has(move.slug)) return false;
    seen.add(move.slug);
    return true;
  });

  await fs.mkdir("src/data", { recursive: true });
  await fs.writeFile(
    OUTPUT_PATH,
    JSON.stringify(uniqueMoves, null, 2),
    "utf8"
  );

  console.log(`Saved ${uniqueMoves.length} moves`);

  const missingTypes = uniqueMoves.filter((m) => !m.type).length;
  const missingStats = uniqueMoves.filter(
    (m) => m.power === null && m.accuracy === null && m.pp === null
  ).length;

  console.log(`Missing type: ${missingTypes}`);
  console.log(`Missing stats: ${missingStats}`);
}

main().catch(console.error);