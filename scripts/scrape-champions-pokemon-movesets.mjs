import fs from "fs";

const BASE_URL = "https://pokebase.app/pokemon-champions/pokemon";
const POKEMON_DATA_PATH = "src/data/champions_pokemon.json";
const OUTPUT_PATH = "src/data/champions_pokemon_likely_moves.json";

function clean(text) {
  return String(text || "").replace(/\s+/g, " ").trim();
}

function titleFromSlug(slug) {
  return String(slug || "")
    .split("-")
    .filter(Boolean)
    .map((word) => word[0].toUpperCase() + word.slice(1))
    .join(" ");
}

async function fetchPage(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

function extractAvailableMoves(html) {
  const moveRegex = /href="\/pokemon-champions\/moves\/([^"]+)"/g;
  const moves = [];
  let match;

  while ((match = moveRegex.exec(html)) !== null) {
    moves.push(titleFromSlug(match[1]));
  }

  return [...new Set(moves)];
}

function extractLikelyMoves(html) {
  const start = html.indexOf('aria-label="Moves"');
  if (start === -1) return [];

  const end = html.indexOf("</ul>", start);
  const section =
    end === -1
      ? html.slice(start, start + 8000)
      : html.slice(start, end);

  const regex =
    /href="\/pokemon-champions\/moves\/([^"]+)".*?<span class="min-w-0 truncate font-medium[^"]*">([^<]+)<\/span>.*?<span class="tabular-nums[^"]*">([\d.]+).*?%<\/span>/gs;

  const moves = [];
  let match;

  while ((match = regex.exec(section)) !== null) {
    moves.push({
      name: clean(match[2]),
      usage: Number(match[3]),
    });
  }

  return moves
    .sort((a, b) => b.usage - a.usage)
    .slice(0, 8)
    .map((m) => m.name);
}

function getSlugs(pokemon) {
  const slugs = new Set();

  if (pokemon.slug) slugs.add(pokemon.slug);

  if (pokemon.name) {
    slugs.add(
      pokemon.name
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  }

  if (pokemon.form) {
    slugs.add(
      `${pokemon.name}-${pokemon.form}`
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "")
    );
  }

  return [...slugs];
}

async function scrapePokemon(pokemon) {
  const slugs = getSlugs(pokemon);

  for (const slug of slugs) {
    try {
      const url = `${BASE_URL}/${slug}`;
      const html = await fetchPage(url);

      return {
        name: pokemon.name,
        form: pokemon.form || null,
        likelyMoves: extractLikelyMoves(html),
        allMoves: extractAvailableMoves(html),
        source: url,
      };
    } catch {
      continue;
    }
  }

  return {
    name: pokemon.name,
    form: pokemon.form || null,
    likelyMoves: [],
    allMoves: [],
    source: null,
  };
}

async function run() {
  const data = JSON.parse(fs.readFileSync(POKEMON_DATA_PATH, "utf8"));
  const results = {};

  for (let i = 0; i < data.length; i++) {
    const pokemon = data[i];
    const label = pokemon.form
      ? `${pokemon.name} (${pokemon.form})`
      : pokemon.name;

    console.log(`[${i + 1}/${data.length}] ${label}`);

    const res = await scrapePokemon(pokemon);
    const key = pokemon.form
      ? `${pokemon.name} (${pokemon.form})`
      : pokemon.name;

    results[key] = res;
  }

  fs.writeFileSync(OUTPUT_PATH, JSON.stringify(results, null, 2));

  console.log("Saved Pokémon movesets");
}

run();