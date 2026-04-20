import { useState } from "react";
import rosterData from "./data/champions_roster_starter.json";

const MY_TEAM_NAMES = [
  "Greninja",
  "Charizard",
  "Garchomp",
  "Scizor",
  "Dragonite",
  "Gengar",
];

function normalizeText(value) {
  return value.toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findPokemon(name, roster) {
  const key = normalizeText(name);

  return roster.find((pokemon) => {
    const matchesName = normalizeText(pokemon.name) === key;
    const matchesSlug = normalizeText(pokemon.slug) === key;
    const matchesAlias = (pokemon.aliases || []).some(
      (alias) => normalizeText(alias) === key
    );

    return matchesName || matchesSlug || matchesAlias;
  });
}

function hasType(pokemon, type) {
  return pokemon.types.includes(type);
}

function scoreMatchup(myPokemon, opponentTeam) {
  let score = 0;
  const warnings = [];

  for (const opp of opponentTeam) {
    if (!opp) continue;

    if (myPokemon.name === "Scizor") {
      if (hasType(opp, "Fairy")) score += 3;
      if (hasType(opp, "Ghost")) score += 1;
      if (hasType(opp, "Fire")) {
        score -= 5;
        warnings.push(`${opp.name} threatens Scizor with Fire`);
      }
      if (hasType(opp, "Steel")) score += 1;
    }

    if (myPokemon.name === "Greninja") {
      if (hasType(opp, "Fire")) score += 2;
      if (hasType(opp, "Ghost")) score += 2;
      if (hasType(opp, "Dragon")) score += 1;
      if (hasType(opp, "Water")) score += 1;
      if (hasType(opp, "Fairy")) score -= 1;
    }

    if (myPokemon.name === "Garchomp") {
      if (hasType(opp, "Steel")) score += 2;
      if (hasType(opp, "Fire")) score += 1;
      if (hasType(opp, "Flying")) {
        score -= 2;
        warnings.push(`${opp.name} can be awkward for Garchomp`);
      }
      if (hasType(opp, "Ice")) {
        score -= 4;
        warnings.push(`${opp.name} threatens Garchomp with Ice`);
      }
      if (hasType(opp, "Fairy")) score -= 2;
    }

    if (myPokemon.name === "Charizard") {
      if (hasType(opp, "Steel")) score += 2;
      if (hasType(opp, "Grass")) score += 2;
      if (hasType(opp, "Water")) {
        score -= 3;
        warnings.push(`${opp.name} pressures Charizard with Water`);
      }
      if (hasType(opp, "Rock")) {
        score -= 3;
        warnings.push(`${opp.name} pressures Charizard with Rock`);
      }
    }

    if (myPokemon.name === "Dragonite") {
      if (hasType(opp, "Ground")) score += 1;
      if (hasType(opp, "Grass")) score += 1;
      if (hasType(opp, "Ice")) {
        score -= 4;
        warnings.push(`${opp.name} threatens Dragonite with Ice`);
      }
      if (hasType(opp, "Fairy")) {
        score -= 3;
        warnings.push(`${opp.name} threatens Dragonite with Fairy`);
      }
    }

    if (myPokemon.name === "Gengar") {
      if (hasType(opp, "Fairy")) score += 2;
      if (hasType(opp, "Ghost")) score += 1;
      if (hasType(opp, "Dark")) {
        score -= 2;
        warnings.push(`${opp.name} can pressure Gengar with Dark`);
      }
    }
  }

  return {
    ...myPokemon,
    score,
    warnings: [...new Set(warnings)],
  };
}

function chooseLead(bestThree, opponentTeam) {
  const hasFairy = opponentTeam.some((p) => hasType(p, "Fairy"));
  const hasFire = opponentTeam.some((p) => hasType(p, "Fire"));
  const hasGhost = opponentTeam.some((p) => hasType(p, "Ghost"));

  const scizor = bestThree.find((p) => p.name === "Scizor");
  const greninja = bestThree.find((p) => p.name === "Greninja");
  const garchomp = bestThree.find((p) => p.name === "Garchomp");

  if (scizor && hasFairy && !hasFire) return "Scizor";
  if (greninja && hasGhost) return "Greninja";
  if (garchomp) return "Garchomp";
  if (greninja) return "Greninja";
  return bestThree[0]?.name || "Greninja";
}

export default function App() {
  const [input, setInput] = useState("");
  const [opponentTeam, setOpponentTeam] = useState([]);
  const [bestThree, setBestThree] = useState([]);
  const [lead, setLead] = useState("");
  const [threats, setThreats] = useState([]);

  const myTeam = MY_TEAM_NAMES.map((name) =>
    rosterData.entries.find((pokemon) => pokemon.name === name && !pokemon.isMega)
  ).filter(Boolean);

  const handleAnalyze = () => {
    const names = input
      .split(/[,\n]+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 6);

    const foundTeam = names
      .map((name) => findPokemon(name, rosterData.entries))
      .filter(Boolean);

    const ranked = myTeam
      .map((pokemon) => scoreMatchup(pokemon, foundTeam))
      .sort((a, b) => b.score - a.score);

    const chosenThree = ranked.slice(0, 3);
    const chosenLead = chooseLead(chosenThree, foundTeam);

    const allWarnings = ranked.flatMap((pokemon) => pokemon.warnings);
    const uniqueThreats = [...new Set(allWarnings)].slice(0, 5);

    setOpponentTeam(foundTeam);
    setBestThree(chosenThree);
    setLead(chosenLead);
    setThreats(uniqueThreats);
  };

  return (
    <div style={{ padding: "24px", fontFamily: "Arial, sans-serif", maxWidth: "900px", margin: "0 auto" }}>
      <h1>Pokémon Champions Assistant</h1>
      <p>Enter the opponent's 6 Pokémon separated by commas or new lines.</p>

      <textarea
        rows="8"
        style={{ width: "100%", marginBottom: "12px", padding: "12px" }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Example: Gengar, Mimikyu, Garchomp, Dragonite, Gyarados, Umbreon"
      />

      <br />

      <button onClick={handleAnalyze} style={{ padding: "10px 16px", marginBottom: "24px" }}>
        Analyze Match
      </button>

      <div style={{ marginBottom: "24px" }}>
        <h2>Opponent Team</h2>
        {opponentTeam.length === 0 ? (
          <p>No team analyzed yet.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {opponentTeam.map((pokemon, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                  minWidth: "140px",
                }}
              >
                <strong>{pokemon.name}</strong>
                {pokemon.form ? ` (${pokemon.form})` : ""}
                <br />
                <span>{pokemon.types.join(", ")}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h2>Best 3</h2>
        {bestThree.length === 0 ? (
          <p>No recommendations yet.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {bestThree.map((pokemon, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                  minWidth: "180px",
                }}
              >
                <strong>{pokemon.name}</strong>
                <br />
                <span>Types: {pokemon.types.join(", ")}</span>
                <br />
                <span>Score: {pokemon.score}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h2>Lead</h2>
        <p>{lead || "No lead yet."}</p>
      </div>

      <div>
        <h2>Threat Warnings</h2>
        {threats.length === 0 ? (
          <p>No warnings yet.</p>
        ) : (
          <ul>
            {threats.map((warning, index) => (
              <li key={index}>{warning}</li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}