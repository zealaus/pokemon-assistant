import { useState } from "react";
import rosterData from "./data/champions_roster_full.json";
import metaStrategies from "./data/meta_strategies.json";

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

function getMeta(pokemonName) {
  return metaStrategies[pokemonName] || null;
}

function scoreMatchup(myPokemon, opponentTeam) {
  let score = 0;
  const warnings = [];
  const fieldRisks = [];

  for (const opp of opponentTeam) {
    if (!opp) continue;

    const oppMeta = getMeta(opp.name);

    if (myPokemon.name === "Scizor") {
      if (hasType(opp, "Fairy")) score += 3;
      if (hasType(opp, "Ghost")) score += 1;
      if (hasType(opp, "Steel")) score += 1;

      if (hasType(opp, "Fire")) {
        score -= 5;
        warnings.push(`${opp.name} threatens Scizor with Fire`);
      }

      if (hasType(opp, "Electric")) {
        warnings.push(`${opp.name} can chip and pressure Scizor over time`);
      }

      if (opp.name === "Dragonite" || opp.name === "Garchomp") {
        warnings.push(`${opp.name} can pressure Scizor if you lose momentum`);
      }
    }

    if (myPokemon.name === "Greninja") {
      if (hasType(opp, "Fire")) score += 2;
      if (hasType(opp, "Ghost")) score += 2;
      if (hasType(opp, "Dragon")) score += 1;
      if (hasType(opp, "Water")) score += 1;
      if (hasType(opp, "Fairy")) score -= 1;

      if (hasType(opp, "Water")) {
        if (opp.name === "Greninja") {
          warnings.push(`Opposing Greninja may force a neutral trade`);
        } else {
          warnings.push(`${opp.name} may force Greninja into a neutral trade`);
        }
      }

      if (hasType(opp, "Grass")) {
        warnings.push(`${opp.name} can be pressured by Greninja with Ice coverage`);
      }
    }

    if (myPokemon.name === "Garchomp") {
      if (hasType(opp, "Steel")) score += 2;
      if (hasType(opp, "Fire")) score += 1;
      if (hasType(opp, "Fairy")) score -= 2;

      if (hasType(opp, "Flying")) {
        score -= 2;
        warnings.push(`${opp.name} can be awkward for Garchomp`);
      }

      if (hasType(opp, "Ice")) {
        score -= 4;
        warnings.push(`${opp.name} threatens Garchomp with Ice`);
      }

      if (opp.name === "Dragonite" || opp.name === "Garchomp") {
        warnings.push(`${opp.name} can pressure Garchomp early`);
      }
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

      if (hasType(opp, "Dragon")) {
        warnings.push(`${opp.name} can force awkward turns for Charizard`);
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

      if (opp.name === "Dragonite" || opp.name === "Garchomp") {
        warnings.push(`${opp.name} can turn into a setup problem for Dragonite`);
      }
    }

    if (myPokemon.name === "Gengar") {
      if (hasType(opp, "Fairy")) score += 2;
      if (hasType(opp, "Ghost")) score += 1;

      if (hasType(opp, "Dark")) {
        if (opp.name === "Greninja") {
          warnings.push(`Opposing Greninja can pressure Gengar with Dark`);
        } else {
          warnings.push(`${opp.name} can pressure Gengar with Dark`);
        }
      }

      if (opp.name === "Dragonite" || opp.name === "Garchomp") {
        warnings.push(`${opp.name} can pressure Gengar if you misposition`);
      }
    }

    if (oppMeta?.fieldRisks) {
      fieldRisks.push(...oppMeta.fieldRisks);
    }
  }

  return {
    ...myPokemon,
    score,
    warnings: [...new Set(warnings)],
    fieldRisks: [...new Set(fieldRisks)],
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

function getTurnOnePlan(lead, opponentTeam) {
  const plans = [];

  if (!lead) return plans;

  for (const opp of opponentTeam) {
    if (!opp) continue;

    const oppMeta = getMeta(opp.name);
    let action = "Scout safely and avoid a bad early trade";

    if (oppMeta?.turnOne?.[lead.name]) {
      action = oppMeta.turnOne[lead.name];
    }

    plans.push({
      opponent: opp.name,
      action,
    });
  }

  return plans;
}

function buildGroupedRisks(chosenThree) {
  return chosenThree
    .map((pokemon) => ({
      pokemon: pokemon.name,
      warnings: [...new Set(pokemon.warnings)],
    }))
    .filter((entry) => entry.warnings.length > 0);
}

function buildFieldRisks(chosenThree) {
  const allFieldRisks = chosenThree.flatMap((pokemon) => pokemon.fieldRisks || []);
  return [...new Set(allFieldRisks)];
}

function buildWinConditions(chosenThree, opponentTeam, lead) {
  const winConditions = [];
  const chosenNames = chosenThree.map((pokemon) => pokemon.name);

  for (const opp of opponentTeam) {
    const oppMeta = getMeta(opp.name);
    if (oppMeta?.winNotes) {
      winConditions.push(...oppMeta.winNotes);
    }
  }

if (chosenNames.includes("Greninja")) {
  const hasDragon = opponentTeam.some((p) =>
    p.types.includes("Dragon")
  );

  const hasGhostOrFire = opponentTeam.some(
    (p) => p.name === "Gengar" || p.name === "Charizard"
  );

  if (hasDragon) {
    winConditions.push(
      "Greninja is your primary answer to Dragon threats via Ice Beam"
    );
  }

  if (hasGhostOrFire) {
    winConditions.push(
      "Greninja can create early momentum by threatening Ghost or Fire matchups"
    );
  }

  if (opponentTeam.some((p) => p.types.includes("Grass"))) {
    winConditions.push(
      "Greninja can pressure Grass matchups with Ice coverage"
    );
  }
}

  if (chosenNames.includes("Scizor")) {
    if (
      opponentTeam.some(
        (pokemon) => pokemon.name === "Mimikyu" || pokemon.name === "Gengar"
      )
    ) {
      winConditions.push("Scizor is key for breaking Mimikyu and controlling late game with priority");
    }
  }

  if (chosenNames.includes("Gengar")) {
    if (opponentTeam.some((pokemon) => hasType(pokemon, "Ghost") || hasType(pokemon, "Fairy"))) {
      winConditions.push("Gengar helps pressure awkward Ghost and Fairy matchups early");
    }
  }

  if (chosenNames.includes("Charizard")) {
    if (opponentTeam.some((pokemon) => hasType(pokemon, "Steel") || hasType(pokemon, "Grass"))) {
      winConditions.push("Charizard can break through Steel or Grass targets to open the endgame");
    }
  }

  if (chosenNames.includes("Garchomp")) {
    winConditions.push("Garchomp can often clean late if faster threats are weakened first");
  }

  if (chosenNames.includes("Dragonite")) {
    winConditions.push("Dragonite becomes a win condition if Fairy and Ice pressure are removed");
  }

  if (lead) {
    winConditions.push(`${lead} is your main piece for establishing early momentum`);
  }

  return [...new Set(winConditions)].slice(0, 4);
}

export default function App() {
  const [input, setInput] = useState("");
  const [opponentTeam, setOpponentTeam] = useState([]);
  const [bestThree, setBestThree] = useState([]);
  const [lead, setLead] = useState("");
  const [risksByPokemon, setRisksByPokemon] = useState([]);
  const [fieldRisks, setFieldRisks] = useState([]);
  const [turnPlan, setTurnPlan] = useState([]);
  const [winConditions, setWinConditions] = useState([]);

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
    const leadPokemon = chosenThree.find((pokemon) => pokemon.name === chosenLead);

    const groupedRisks = buildGroupedRisks(chosenThree);
    const globalFieldRisks = buildFieldRisks(chosenThree);
    const plans = getTurnOnePlan(leadPokemon, foundTeam);
    const wins = buildWinConditions(chosenThree, foundTeam, chosenLead);

    setOpponentTeam(foundTeam);
    setBestThree(chosenThree);
    setLead(chosenLead);
    setRisksByPokemon(groupedRisks);
    setFieldRisks(globalFieldRisks);
    setTurnPlan(plans);
    setWinConditions(wins);
  };

  return (
    <div
      style={{
        padding: "24px",
        fontFamily: "Arial, sans-serif",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <h1>Pokémon Champions Assistant</h1>
      <p>Enter the opponent&apos;s 6 Pokémon separated by commas or new lines.</p>

      <textarea
        rows="8"
        style={{ width: "100%", marginBottom: "12px", padding: "12px" }}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Example: Gengar, Mimikyu, Garchomp, Dragonite, Gyarados, Umbreon"
      />

      <br />

      <button
        onClick={handleAnalyze}
        style={{ padding: "10px 16px", marginBottom: "24px" }}
      >
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

      <div style={{ marginBottom: "24px" }}>
        <h2>Key Risks</h2>
        {risksByPokemon.length === 0 ? (
          <p>No major risks flagged.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {risksByPokemon.map((entry, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                  minWidth: "240px",
                }}
              >
                <strong>{entry.pokemon}</strong>
                <ul style={{ marginTop: "8px", paddingLeft: "18px" }}>
                  {entry.warnings.map((warning, warningIndex) => (
                    <li key={warningIndex}>{warning}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h2>Field Risks</h2>
        {fieldRisks.length === 0 ? (
          <p>No major field risks flagged.</p>
        ) : (
          <ul>
            {fieldRisks.map((risk, index) => (
              <li key={index}>{risk}</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginBottom: "24px" }}>
        <h2>Win Conditions</h2>
        {winConditions.length === 0 ? (
          <p>No clear win conditions yet.</p>
        ) : (
          <ul>
            {winConditions.map((condition, index) => (
              <li key={index}>{condition}</li>
            ))}
          </ul>
        )}
      </div>

      <div style={{ marginTop: "24px" }}>
        <h2>Turn 1 Plan</h2>
        {turnPlan.length === 0 ? (
          <p>No plan yet.</p>
        ) : (
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
            {turnPlan.map((plan, index) => (
              <div
                key={index}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "8px",
                  padding: "10px",
                  minWidth: "220px",
                }}
              >
                <strong>vs {plan.opponent}</strong>
                <br />
                <span>{plan.action}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}