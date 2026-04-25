import { useState } from "react";
import metaStrategies from "./data/meta_strategies.json";
import PokemonSearchPicker from "./components/PokemonSearchPicker";
import TeamBuilder, { emptyTeam } from "./components/TeamBuilder";
import pokemonData from "./data/champions_pokemon.json";

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function findPokemon(name) {
  const key = normalizeText(name);

  return pokemonData.find((pokemon) => {
    const matchesName = normalizeText(pokemon.name) === key;
    const matchesSlug = normalizeText(pokemon.slug) === key;
    const matchesDisplayName = normalizeText(pokemon.displayName || "") === key;
    const matchesAlias = (pokemon.aliases || []).some(
      (alias) => normalizeText(alias) === key
    );

    return matchesName || matchesSlug || matchesDisplayName || matchesAlias;
  });
}

function getSpriteForPokemon(pokemon) {
  if (!pokemon) return "";
  if (pokemon.sprite) return pokemon.sprite;

  const match = findPokemon(pokemon.name || pokemon.slug);

  return match?.sprite || "";
}

function hasType(pokemon, type) {
  return (pokemon.types || []).includes(type);
}

function getMeta(pokemonName) {
  return metaStrategies[pokemonName] || null;
}

function hasMove(pokemon, moveName) {
  return (pokemon.moves || []).some(
    (move) => normalizeText(move) === normalizeText(moveName)
  );
}

function hasAbility(pokemon, abilityName) {
  const baseAbility = pokemon.ability?.base || "";
  const megaAbility = pokemon.ability?.mega || "";

  return (
    normalizeText(baseAbility) === normalizeText(abilityName) ||
    normalizeText(megaAbility) === normalizeText(abilityName)
  );
}

function hasItem(pokemon, itemName) {
  return (
    normalizeText(pokemon.item || "") === normalizeText(itemName) ||
    normalizeText(pokemon.megaItem || "") === normalizeText(itemName)
  );
}

function toStatNumber(value) {
  if (value === "" || value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildMyTeamFromBuilder(builderTeam) {
  return (builderTeam.members || [])
    .filter((teamMember) => teamMember.name)
    .map((teamMember) => {
      const pokemonEntry = findPokemon(teamMember.name);

      if (!pokemonEntry) return null;

      return {
        ...pokemonEntry,
        slot: teamMember.slot,
        form: teamMember.form || pokemonEntry.form || null,
        item: teamMember.item || null,
        megaItem: null,
        ability: {
          base: teamMember.ability || "",
          mega: null,
          confidence: teamMember.ability ? "user_provided" : "unknown",
        },
        statAlignment: {
          name: teamMember.nature || "",
          source: teamMember.nature ? "user_provided" : "unknown",
          confidence: teamMember.nature ? "user_provided" : "unknown",
        },
        statPoints: {
          hp: toStatNumber(teamMember.stats?.hp),
          attack: toStatNumber(teamMember.stats?.attack),
          defense: toStatNumber(teamMember.stats?.defense),
          spAttack: toStatNumber(teamMember.stats?.spAttack),
          spDefense: toStatNumber(teamMember.stats?.spDefense),
          speed: toStatNumber(teamMember.stats?.speed),
        },
        moves: (teamMember.moves || []).filter(Boolean),
      };
    })
    .filter(Boolean);
}

function getRoleLabel(pokemon) {
  if (pokemon.name === "Greninja") {
    return hasMove(pokemon, "U-turn") ? "Lead / pivot" : "Lead / pressure";
  }

  if (pokemon.name === "Scizor") {
    return "Priority cleanup";
  }

  if (pokemon.name === "Dragonite") {
    return hasMove(pokemon, "Dragon Dance")
      ? "Win condition"
      : "Late game pressure";
  }

  if (pokemon.name === "Gengar") {
    return hasMove(pokemon, "Nasty Plot")
      ? "Breaker / setup"
      : "Special pressure";
  }

  if (pokemon.name === "Garchomp") {
    return hasMove(pokemon, "Swords Dance") ? "Breaker" : "Cleaner";
  }

  if (pokemon.name === "Charizard") {
    return "Wallbreaker";
  }

  return "Flexible";
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
      if (hasMove(myPokemon, "Bullet Punch")) score += 1;
      if (hasMove(myPokemon, "U-turn")) score += 1;

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

      if (hasMove(myPokemon, "Ice Beam") && hasType(opp, "Dragon")) score += 2;
      if (hasMove(myPokemon, "Dark Pulse") && hasType(opp, "Ghost")) score += 2;
      if (hasMove(myPokemon, "Hydro Pump") && hasType(opp, "Fire")) score += 1;
      if (hasMove(myPokemon, "U-turn")) score += 1;
      if (hasAbility(myPokemon, "Protean")) score += 1;

      if (hasType(opp, "Water")) {
        if (opp.name === "Greninja") {
          warnings.push(`Opposing Greninja may force a neutral trade`);
        } else {
          warnings.push(`${opp.name} may force Greninja into a neutral trade`);
        }
      }

      if (hasType(opp, "Grass") && hasMove(myPokemon, "Ice Beam")) {
        warnings.push(`${opp.name} can be pressured by Greninja with Ice coverage`);
      }
    }

    if (myPokemon.name === "Garchomp") {
      if (hasType(opp, "Steel")) score += 2;
      if (hasType(opp, "Fire")) score += 1;
      if (hasType(opp, "Fairy")) score -= 2;
      if (hasMove(myPokemon, "Swords Dance")) score += 1;
      if (hasItem(myPokemon, "Yache Berry")) score += 1;

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
      if (hasAbility(myPokemon, "Drought")) score += 1;
      if (hasMove(myPokemon, "Roost")) score += 1;

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
      if (hasMove(myPokemon, "Dragon Dance")) score += 1;
      if (hasMove(myPokemon, "Extreme Speed")) score += 1;
      if (hasAbility(myPokemon, "Multiscale")) score += 1;

      if (hasType(opp, "Ice")) {
        score -= 4;
        warnings.push(`${opp.name} threatens Dragonite with Ice`);
      }

      if (hasType(opp, "Fairy")) {
        score -= 3;
        warnings.push(`${opp.name} threatens Dragonite with Fairy`);
      }

      if (opp.name === "Dragonite") {
        warnings.push(`Opposing Dragonite can become a setup threat`);
      }

      if (opp.name === "Garchomp") {
        warnings.push(`Garchomp can become a setup threat if unchecked`);
      }
    }

    if (myPokemon.name === "Gengar") {
      if (hasType(opp, "Fairy")) score += 2;
      if (hasType(opp, "Ghost")) score += 1;
      if (hasMove(myPokemon, "Nasty Plot")) score += 1;

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
  const hasDragon = opponentTeam.some((p) => hasType(p, "Dragon"));

  const scizor = bestThree.find((p) => p.name === "Scizor");
  const greninja = bestThree.find((p) => p.name === "Greninja");
  const garchomp = bestThree.find((p) => p.name === "Garchomp");
  const dragonite = bestThree.find((p) => p.name === "Dragonite");

  if (greninja && hasDragon && hasMove(greninja, "Ice Beam")) return "Greninja";
  if (scizor && hasFairy && !hasFire) return "Scizor";
  if (greninja && hasGhost && hasMove(greninja, "Dark Pulse")) return "Greninja";
  if (garchomp) return "Garchomp";
  if (dragonite && hasMove(dragonite, "Dragon Dance")) return "Dragonite";
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
    } else {
      if (oppMeta?.tags?.includes("setup_sweeper")) {
        action = "Deny setup early and avoid giving a free turn";
      } else if (oppMeta?.tags?.includes("fast_special")) {
        action = "Respect speed and scout before committing";
      } else if (oppMeta?.tags?.includes("bulky_water")) {
        action = "Avoid neutral trades and pivot if needed";
      } else if (hasType(opp, "Flying")) {
        action = "Chip safely or pivot before overcommitting";
      } else if (hasType(opp, "Steel")) {
        action = "Pressure carefully and avoid wasting momentum";
      }
    }

    if (lead.name === "Greninja" && hasMove(lead, "Ice Beam") && hasType(opp, "Dragon")) {
      action = "Ice Beam immediately and deny setup";
    }

    if (lead.name === "Greninja" && hasMove(lead, "Dark Pulse") && hasType(opp, "Ghost")) {
      action = "Stay in and click Dark Pulse";
    }

    if (lead.name === "Greninja" && hasMove(lead, "Hydro Pump") && hasType(opp, "Fire")) {
      action = "Pressure immediately with Hydro Pump";
    }

    if (lead.name === "Scizor" && hasMove(lead, "Bullet Punch") && opp.name === "Mimikyu") {
      action = "Break Disguise safely with Bullet Punch";
    }

    if (lead.name === "Scizor" && hasMove(lead, "U-turn") && hasType(opp, "Fire")) {
      action = "Pivot out immediately and avoid losing Scizor early";
    }

    if (lead.name === "Dragonite" && hasMove(lead, "Dragon Dance")) {
      if (!hasType(opp, "Fairy") && !hasType(opp, "Ice")) {
        action = "Consider preserving Dragonite for a later setup window";
      }
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

function summarizeRisk(entry) {
  const text = entry.warnings.join(" ").toLowerCase();

  if (entry.pokemon === "Greninja") {
    if (text.includes("neutral trade")) {
      return "Neutral trade risk vs bulky Water";
    }
    if (text.includes("grass")) {
      return "Watch coverage and forced trades";
    }
  }

  if (entry.pokemon === "Dragonite") {
    const hasSetup = text.includes("setup threat");
    const hasFairy = text.includes("fairy");

    if (hasSetup && hasFairy) {
      return "Setup mirrors and Fairy pressure";
    }
    if (hasSetup) {
      return "Setup pressure if unchecked";
    }
  }

  if (entry.pokemon === "Scizor") {
    if (text.includes("fire")) {
      return "Fire pressure punishes bad positioning";
    }
    if (text.includes("momentum")) {
      return "Momentum loss can turn this awkward";
    }
  }

  if (entry.pokemon === "Gengar") {
    if (text.includes("dark")) {
      return "Dark pressure can force bad trades";
    }
  }

  if (entry.pokemon === "Garchomp") {
    if (text.includes("ice")) {
      return "Ice coverage is the main danger";
    }
  }

  const firstWarning = entry.warnings[0] || "";
  return firstWarning.length > 54
    ? `${firstWarning.slice(0, 54)}...`
    : firstWarning;
}

function buildWinConditions(chosenThree, opponentTeam, lead) {
  const winConditions = [];
  const greninja = chosenThree.find((p) => p.name === "Greninja");
  const scizor = chosenThree.find((p) => p.name === "Scizor");
  const dragonite = chosenThree.find((p) => p.name === "Dragonite");
  const gengar = chosenThree.find((p) => p.name === "Gengar");
  const charizard = chosenThree.find((p) => p.name === "Charizard");
  const garchomp = chosenThree.find((p) => p.name === "Garchomp");

  for (const opp of opponentTeam) {
    const oppMeta = getMeta(opp.name);
    if (oppMeta?.winNotes) {
      winConditions.push(...oppMeta.winNotes);
    }
  }

  if (greninja) {
    const hasDragon = opponentTeam.some((p) => hasType(p, "Dragon"));
    const hasGhost = opponentTeam.some((p) => hasType(p, "Ghost"));
    const hasGrass = opponentTeam.some((p) => hasType(p, "Grass"));
    const hasFire = opponentTeam.some((p) => hasType(p, "Fire"));

    if (hasDragon && hasMove(greninja, "Ice Beam")) {
      winConditions.push("Greninja is your primary Dragon answer through Ice Beam");
    }

    if (hasGhost && hasMove(greninja, "Dark Pulse")) {
      winConditions.push("Greninja pressures Ghost matchups with Dark Pulse");
    }

    if (hasFire && hasMove(greninja, "Hydro Pump")) {
      winConditions.push("Greninja can create early momentum by threatening Fire matchups");
    }

    if (hasGrass && hasMove(greninja, "Ice Beam")) {
      winConditions.push("Greninja can pressure Grass matchups with Ice coverage");
    }

    if (hasMove(greninja, "U-turn")) {
      winConditions.push("Greninja can preserve momentum with U-turn instead of forcing bad trades");
    }
  }

  if (scizor) {
    if (opponentTeam.some((pokemon) => pokemon.name === "Mimikyu") && hasMove(scizor, "Bullet Punch")) {
      winConditions.push("Scizor is key for breaking Mimikyu cleanly with Bullet Punch");
    }

    if (hasMove(scizor, "Bullet Punch")) {
      winConditions.push("Preserve Scizor if you need priority to clean late");
    }

    if (hasMove(scizor, "U-turn")) {
      winConditions.push("Scizor can pivot to maintain momentum instead of overcommitting early");
    }
  }

  if (gengar) {
    if (opponentTeam.some((pokemon) => hasType(pokemon, "Ghost") || hasType(pokemon, "Fairy"))) {
      winConditions.push("Gengar helps pressure awkward Ghost and Fairy matchups early");
    }

    if (hasMove(gengar, "Nasty Plot")) {
      winConditions.push("Look for a safe Nasty Plot window if the opponent gives passive turns");
    }
  }

  if (charizard) {
    if (opponentTeam.some((pokemon) => hasType(pokemon, "Steel") || hasType(pokemon, "Grass"))) {
      winConditions.push("Charizard can break through Steel or Grass targets to open the endgame");
    }

    if (hasAbility(charizard, "Drought")) {
      winConditions.push("Mega Charizard can swing games quickly once Drought is active");
    }
  }

  if (garchomp) {
    if (hasMove(garchomp, "Swords Dance")) {
      winConditions.push("Garchomp can become a late game breaker if given one setup turn");
    } else {
      winConditions.push("Garchomp can often clean late if faster threats are weakened first");
    }
  }

  if (dragonite) {
    if (hasMove(dragonite, "Dragon Dance")) {
      winConditions.push("Dragonite becomes a win condition if Fairy and Ice pressure are removed");
    }

    if (hasMove(dragonite, "Extreme Speed")) {
      winConditions.push("Dragonite can still provide priority value even before setting up");
    }
  }

  if (lead) {
    winConditions.push(`${lead} is your main piece for establishing early momentum`);
  }

  return [...new Set(winConditions)].slice(0, 3);
}

function orderBestThreeWithLead(bestThree, lead) {
  if (!lead) return bestThree;

  const leadPick = bestThree.find((pokemon) => pokemon.name === lead);
  const others = bestThree.filter((pokemon) => pokemon.name !== lead);

  return leadPick ? [leadPick, ...others].slice(0, 3) : bestThree;
}

const styles = {
  page: {
    padding: "20px 20px 28px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "980px",
    margin: "0 auto",
  },
  title: {
    fontSize: "44px",
    lineHeight: 1.1,
    marginBottom: "8px",
    textAlign: "center",
  },
  subtitle: {
    textAlign: "center",
    opacity: 0.85,
    marginBottom: "18px",
  },
  textarea: {
    width: "100%",
    marginBottom: "12px",
    padding: "14px",
    borderRadius: "10px",
    border: "1px solid #555",
    background: "#1a1a24",
    color: "#fff",
    fontSize: "15px",
    boxSizing: "border-box",
  },
  textareaWrap: {
    marginBottom: "6px",
  },
  fallbackNote: {
    textAlign: "center",
    opacity: 0.7,
    fontSize: "12px",
    marginBottom: "10px",
  },
  buttonWrap: {
    textAlign: "center",
    marginBottom: "24px",
  },
  button: {
    padding: "10px 18px",
    borderRadius: "10px",
    border: "1px solid #777",
    background: "#20202b",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
  },
  section: {
    marginBottom: "22px",
  },
  sectionTitle: {
    fontSize: "15px",
    fontWeight: 700,
    textAlign: "center",
    marginBottom: "10px",
  },
  cardGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "6px",
    justifyContent: "center",
  },
  smallCard: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "8px 10px",
    minWidth: "150px",
    textAlign: "center",
    boxSizing: "border-box",
    background: "#15151d",
  },
  cardSprite: {
    width: "54px",
    height: "54px",
    objectFit: "contain",
    imageRendering: "pixelated",
    marginBottom: "4px",
  },
  recommendationGrid: {
    display: "flex",
    gap: "8px",
    justifyContent: "center",
    flexWrap: "wrap",
  },
  bestCard: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "8px 10px",
    minWidth: "118px",
    textAlign: "center",
    boxSizing: "border-box",
    position: "relative",
    background: "#15151d",
  },
  leadBestCard: {
    border: "1px solid #45c26b",
    boxShadow: "0 0 0 1px rgba(69, 194, 107, 0.35)",
  },
  leadBadge: {
    position: "absolute",
    top: "6px",
    right: "6px",
    fontSize: "10px",
    fontWeight: 700,
    color: "#75e096",
    border: "1px solid rgba(117, 224, 150, 0.7)",
    borderRadius: "999px",
    padding: "2px 6px",
    background: "rgba(69, 194, 107, 0.1)",
  },
  bestName: {
    fontWeight: 700,
    marginBottom: "2px",
    fontSize: "14px",
  },
  bestMeta: {
    fontSize: "12px",
    opacity: 0.9,
    marginBottom: "2px",
  },
  bestRole: {
    fontSize: "11px",
    opacity: 0.72,
  },
  turnGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
  },
  turnCard: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "9px 11px",
    minWidth: "200px",
    textAlign: "center",
    background: "#15151d",
  },
  turnVs: {
    fontWeight: 700,
    marginBottom: "3px",
    fontSize: "15px",
  },
  turnAction: {
    fontSize: "13px",
    opacity: 0.9,
  },
  boxedList: {
    border: "1px solid #ccc",
    borderRadius: "12px",
    padding: "10px 14px",
    maxWidth: "720px",
    margin: "0 auto",
  },
  plainList: {
    maxWidth: "720px",
    margin: "0 auto",
    paddingLeft: "20px",
  },
  emptyText: {
    textAlign: "center",
    opacity: 0.75,
  },
};

export default function App() {
  const [builderTeam, setBuilderTeam] = useState(emptyTeam);
  const [input, setInput] = useState("");
  const [selectedOpponentPokemon, setSelectedOpponentPokemon] = useState([]);
  const [opponentTeam, setOpponentTeam] = useState([]);
  const [bestThree, setBestThree] = useState([]);
  const [lead, setLead] = useState("");
  const [risksByPokemon, setRisksByPokemon] = useState([]);
  const [fieldRisks, setFieldRisks] = useState([]);
  const [turnPlan, setTurnPlan] = useState([]);
  const [winConditions, setWinConditions] = useState([]);

  const myTeam = buildMyTeamFromBuilder(builderTeam);
  const showFallbackTextarea = selectedOpponentPokemon.length < 6;
  const orderedBestThree = orderBestThreeWithLead(bestThree, lead);
  const shouldShowAnalyzedOpponentTeam =
    selectedOpponentPokemon.length === 0 && opponentTeam.length > 0;

  const handleAnalyze = () => {
    const selectedFromPicker = selectedOpponentPokemon
      .map((pokemon) => findPokemon(pokemon.name))
      .filter(Boolean)
      .slice(0, 6);

    const parsedFromText = input
      .split(/[,\n]+/)
      .map((name) => name.trim())
      .filter(Boolean)
      .slice(0, 6)
      .map((name) => findPokemon(name))
      .filter(Boolean);

    const foundTeam =
      selectedFromPicker.length > 0 ? selectedFromPicker : parsedFromText;

    const ranked = myTeam
      .map((pokemon) => scoreMatchup(pokemon, foundTeam))
      .sort((a, b) => b.score - a.score);

    const chosenThree = ranked.slice(0, 3).map((pokemon) => ({
      ...pokemon,
      role: getRoleLabel(pokemon),
    }));

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
    <div style={styles.page}>
      <h1 style={styles.title}>Pokémon Champions Assistant</h1>
      <p style={styles.subtitle}>Search and click the opponent&apos;s Pokémon...</p>

      <TeamBuilder team={builderTeam} setTeam={setBuilderTeam} />

      <PokemonSearchPicker
        pokemonData={pokemonData}
        selectedPokemon={selectedOpponentPokemon}
        setSelectedPokemon={setSelectedOpponentPokemon}
        normalizeText={normalizeText}
      />

      {showFallbackTextarea && (
        <div style={styles.textareaWrap}>
          <div style={styles.fallbackNote}>
            Optional fallback input if you want to paste names manually.
          </div>

          <textarea
            rows="4"
            style={styles.textarea}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Optional fallback: Gengar, Mimikyu, Garchomp, Dragonite, Gyarados, Umbreon"
          />
        </div>
      )}

      <div style={styles.buttonWrap}>
        <button onClick={handleAnalyze} style={styles.button}>
          Analyze Match
        </button>
      </div>

      {shouldShowAnalyzedOpponentTeam && (
        <div style={styles.section}>
          <h2 style={styles.sectionTitle}>Opponent Team</h2>

          <div style={styles.cardGrid}>
            {opponentTeam.map((pokemon, index) => (
              <div key={index} style={styles.smallCard}>
                {getSpriteForPokemon(pokemon) && (
                  <img
                    src={getSpriteForPokemon(pokemon)}
                    alt={pokemon.name}
                    style={styles.cardSprite}
                  />
                )}

                <strong>{pokemon.name}</strong>
                {pokemon.form ? ` (${pokemon.form})` : ""}
                <br />

                <span style={{ fontSize: "13px", opacity: 0.9 }}>
                  {pokemon.types.join(", ")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Recommended 3</h2>

        {orderedBestThree.length === 0 ? (
          <p style={styles.emptyText}>No recommendations yet.</p>
        ) : (
          <div style={styles.recommendationGrid}>
            {orderedBestThree.map((pokemon, index) => {
              const isLead = pokemon.name === lead;

              return (
                <div
                  key={index}
                  style={{
                    ...styles.bestCard,
                    ...(isLead ? styles.leadBestCard : {}),
                  }}
                >
                  {isLead && <div style={styles.leadBadge}>Lead</div>}

                  {getSpriteForPokemon(pokemon) && (
                    <img
                      src={getSpriteForPokemon(pokemon)}
                      alt={pokemon.name}
                      style={styles.cardSprite}
                    />
                  )}

                  <div style={styles.bestName}>{pokemon.name}</div>
                  <div style={styles.bestMeta}>{pokemon.types.join(", ")}</div>
                  <div style={styles.bestMeta}>Score: {pokemon.score}</div>
                  <div style={styles.bestRole}>{pokemon.role}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Turn 1 Plan</h2>
        {turnPlan.length === 0 ? (
          <p style={styles.emptyText}>No plan yet.</p>
        ) : (
          <div style={styles.turnGrid}>
            {turnPlan.map((plan, index) => (
              <div key={index} style={styles.turnCard}>
                <div style={styles.turnVs}>vs {plan.opponent}</div>
                <div style={styles.turnAction}>{plan.action}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>How you win this matchup</h2>
        {winConditions.length === 0 ? (
          <p style={styles.emptyText}>No clear win conditions yet.</p>
        ) : (
          <div style={styles.boxedList}>
            <ul style={styles.plainList}>
              {winConditions.map((condition, index) => (
                <li key={index}>{condition}</li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Key Risks</h2>
        {risksByPokemon.length === 0 ? (
          <p style={styles.emptyText}>No major risks flagged.</p>
        ) : (
          <div style={styles.turnGrid}>
            {risksByPokemon.map((entry, index) => (
              <div key={index} style={styles.turnCard}>
                <div style={styles.turnVs}>{entry.pokemon}</div>
                <div style={styles.turnAction}>{summarizeRisk(entry)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Field Risks</h2>
        {fieldRisks.length === 0 ? (
          <p style={styles.emptyText}>No major field risks flagged.</p>
        ) : (
          <div style={styles.boxedList}>
            <ul style={styles.plainList}>
              {fieldRisks.map((risk, index) => (
                <li key={index}>{risk}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}