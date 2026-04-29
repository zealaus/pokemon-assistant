import { useState } from "react";
import PokemonSearchPicker from "./components/PokemonSearchPicker";
import TeamBuilder, { emptyTeam } from "./components/TeamBuilder";
import pokemonData from "./data/champions_pokemon.json";
import typeChart from "./data/type_chart.json";
import championsMoves from "./data/champions_moves.json";
import pokemonMovesets from "./data/champions_pokemon_likely_moves.json";
import strategyRules from "./data/strategy_rules.json";
import moveFallbacks from "./data/move_fallbacks.json";
import megaRules from "./data/mega_rules.json";

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function displayPokemonName(pokemon) {
  if (!pokemon) return "";
  return pokemon.displayName || (pokemon.form ? `${pokemon.name} (${pokemon.form})` : pokemon.name);
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

function getMovesetKey(pokemon) {
  if (!pokemon) return "";
  return pokemon.form ? `${pokemon.name} (${pokemon.form})` : pokemon.name;
}

function getMovesetForPokemon(pokemon) {
  if (!pokemon) return null;

  const displayKey = getMovesetKey(pokemon);
  const nameKey = pokemon.name;

  return (
    pokemonMovesets[displayKey] ||
    pokemonMovesets[nameKey] ||
    pokemonMovesets[pokemon.displayName] ||
    null
  );
}

function getMoveData(moveName) {
  const key = normalizeText(moveName);

  const move = championsMoves.find((m) => {
    return normalizeText(m.name) === key || normalizeText(m.slug) === key;
  });

  const fallback = Object.entries(moveFallbacks).find(
    ([name]) => normalizeText(name) === key
  )?.[1];

  let power = move?.power ?? fallback?.power ?? null;
  let accuracy = move?.accuracy ?? fallback?.accuracy ?? null;

  // ✅ Intelligent fallback for missing damaging moves
  if (power === null && move?.category !== "Status") {
    power = 70; // safe mid-tier estimate
  }

  if (accuracy === null && move?.category !== "Status") {
    accuracy = 100;
  }

  return {
    name: move?.name || moveName,
    type: move?.type ?? fallback?.type ?? "Normal",
    power,
    accuracy,
    category:
      move?.category ??
      fallback?.category ??
      (power === null ? "Status" : "Physical"),
  };
}

function getMoveNamesFromRules(groupName) {
  return strategyRules.moves?.[groupName] || [];
}

function moveNameMatches(moveName, candidates = []) {
  const key = normalizeText(moveName);
  return candidates.some((candidate) => normalizeText(candidate) === key);
}

function getTypeEffectiveness(attackingType, defendingTypes = []) {
  return defendingTypes.reduce((multiplier, defendingType) => {
    const value = typeChart[attackingType]?.[defendingType] ?? 1;
    return multiplier * value;
  }, 1);
}

function isDamagingMove(moveName) {
  const move = getMoveData(moveName);
  return Boolean(move?.type && move?.power);
}

function isPriorityMove(moveName) {
  const move = getMoveData(moveName);
  const priorityMoves = getMoveNamesFromRules("priority");
  const description = normalizeText(move?.description || "");

  return (
    moveNameMatches(moveName, priorityMoves) ||
    description.includes("alwaysgoesfirst") ||
    description.includes("attackfirst")
  );
}

function isSetupMove(moveName) {
  const move = getMoveData(moveName);
  const setupMoves = getMoveNamesFromRules("setup");
  const description = normalizeText(move?.description || "");

  return (
    moveNameMatches(moveName, setupMoves) ||
    description.includes("boosts") ||
    description.includes("maximizes") ||
    description.includes("sharplyboosts")
  );
}

function isPivotMove(moveName) {
  const move = getMoveData(moveName);
  const pivotMoves = getMoveNamesFromRules("pivot");
  const description = normalizeText(move?.description || "");

  return (
    moveNameMatches(moveName, pivotMoves) ||
    description.includes("switchplaces") ||
    description.includes("rushesback")
  );
}

function isRecoveryMove(moveName) {
  const move = getMoveData(moveName);
  const recoveryMoves = getMoveNamesFromRules("recovery");
  const description = normalizeText(move?.description || "");

  return (
    moveNameMatches(moveName, recoveryMoves) ||
    description.includes("restores") ||
    description.includes("regenerates")
  );
}

function hasPriorityMove(pokemon) {
  return (pokemon.moves || []).some(isPriorityMove);
}

function hasSetupMove(pokemon) {
  return (pokemon.moves || []).some(isSetupMove);
}

function hasPivotMove(pokemon) {
  return (pokemon.moves || []).some(isPivotMove);
}

function hasRecoveryMove(pokemon) {
  return (pokemon.moves || []).some(isRecoveryMove);
}

function getFirstMoveByRule(pokemon, ruleName) {
  const moves = pokemon.moves || [];

  if (ruleName === "priority") return moves.find(isPriorityMove) || "";
  if (ruleName === "setup") return moves.find(isSetupMove) || "";
  if (ruleName === "pivot") return moves.find(isPivotMove) || "";
  if (ruleName === "recovery") return moves.find(isRecoveryMove) || "";

  return "";
}

function getMoveSourceRank(pokemon, moveName) {
  const key = normalizeText(moveName);
  const moveset = getMovesetForPokemon(pokemon);
  const likelyMoves = moveset?.likelyMoves || [];
  const allMoves = moveset?.allMoves || [];

  const likelyIndex = likelyMoves.findIndex((move) => normalizeText(move) === key);
  if (likelyIndex !== -1) {
    return {
      source: "likely",
      rank: likelyIndex,
      confidence: Math.max(0.65, 1 - likelyIndex * 0.07),
    };
  }

  const allIndex = allMoves.findIndex((move) => normalizeText(move) === key);
  if (allIndex !== -1) {
    return {
      source: "available",
      rank: allIndex,
      confidence: 0.3,
    };
  }

  return {
    source: "manual",
    rank: 0,
    confidence: 1,
  };
}

function getLikelyMovesForPokemon(pokemon) {
  const moveset = getMovesetForPokemon(pokemon);
  return moveset?.likelyMoves || [];
}

function getUsableMovesForPokemon(pokemon, manualMoves = []) {
  const cleanedManualMoves = (manualMoves || []).filter(Boolean);

  if (cleanedManualMoves.length > 0) {
    return cleanedManualMoves;
  }

  const moveset = getMovesetForPokemon(pokemon);
  const likelyMoves = moveset?.likelyMoves || [];
  const allMoves = moveset?.allMoves || [];

  if (likelyMoves.length > 0) {
    return likelyMoves.slice(0, 4);
  }

  return allMoves
    .filter((moveName) => isDamagingMove(moveName) || isSetupMove(moveName) || isPriorityMove(moveName) || isPivotMove(moveName))
    .slice(0, 6);
}

function hydratePokemon(pokemon, manualMoves = []) {
  if (!pokemon) return null;

  const fullPokemon = pokemon.types ? pokemon : findPokemon(pokemon.name || pokemon.slug);

  if (!fullPokemon) return null;

  const moves = getUsableMovesForPokemon(fullPokemon, manualMoves);

  return {
    ...fullPokemon,
    ...pokemon,
    displayName: pokemon.displayName || fullPokemon.displayName || displayPokemonName(fullPokemon),
    types: pokemon.types || fullPokemon.types || [],
    sprite: pokemon.sprite || fullPokemon.sprite || "",
    moves,
    moveEntrySource: manualMoves.filter(Boolean).length > 0 ? "manual" : "database",
  };
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

      const manualMoves = (teamMember.moves || []).filter(Boolean);
      const hydrated = hydratePokemon(pokemonEntry, manualMoves);

      return {
        ...hydrated,
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
        moves: getUsableMovesForPokemon(pokemonEntry, manualMoves),
      };
    })
    .filter(Boolean);
}

function getMovePressureScore(myPokemon, moveName, opponentPokemon, options = {}) {
  const move = getMoveData(moveName);

  if (!move?.type || !move?.power) {
    return 0;
  }

  const effectiveness = getTypeEffectiveness(move.type, opponentPokemon.types || []);
  const stab = (myPokemon.types || []).includes(move.type) ? 1.5 : 1;
  const reliability = move.accuracy ? move.accuracy / 100 : 1;
  const powerFactor = move.power / 80;
  const priorityBonus = isPriorityMove(moveName) ? 0.35 : 0;
  const sourceInfo = getMoveSourceRank(myPokemon, moveName);

  let usageBias = sourceInfo.confidence;

  if (myPokemon.moveEntrySource === "manual") {
    usageBias = 1;
  }

  if (sourceInfo.source === "available") {
    usageBias = options.allowAvailableMoves ? 0.28 : 0;
  }

  const superEffectiveBoost = effectiveness >= 4 ? 2.15 : effectiveness >= 2 ? 1.65 : 1;
  const neutralLowImpactPenalty = effectiveness === 1 && move.power < 90 ? 0.82 : 1;
  const nonStabCoveragePenalty = stab === 1 && effectiveness < 2 ? 0.82 : 1;
  const lowPowerPenalty = move.power <= 50 && !isPriorityMove(moveName) ? 0.8 : 1;

  return (
    effectiveness *
      stab *
      reliability *
      powerFactor *
      usageBias *
      superEffectiveBoost *
      neutralLowImpactPenalty *
      nonStabCoveragePenalty *
      lowPowerPenalty +
    priorityBonus
  );
}

function getBestMoveInto(myPokemon, opponentPokemon, options = {}) {
  const moves = myPokemon.moves || [];
  let best = null;

  for (const moveName of moves) {
    const move = getMoveData(moveName);
    const sourceInfo = getMoveSourceRank(myPokemon, moveName);

    if (!move?.type || !move?.power) continue;

    if (!options.allowAvailableMoves && sourceInfo.source === "available") {
      continue;
    }

    const score = getMovePressureScore(myPokemon, moveName, opponentPokemon, options);
    const effectiveness = getTypeEffectiveness(move.type, opponentPokemon.types || []);

    if (!best || score > best.score) {
      best = {
        name: move.name,
        type: move.type,
        power: move.power,
        accuracy: move.accuracy,
        effectiveness,
        score,
        source: sourceInfo.source,
      };
    }
  }

  if (!best && !options.allowAvailableMoves) {
    return getBestMoveInto(myPokemon, opponentPokemon, { ...options, allowAvailableMoves: true });
  }

  return best;
}

function getBestThreatMoveInto(attackerPokemon, defenderPokemon) {
  const likelyMoves = getLikelyMovesForPokemon(attackerPokemon);

  if (attackerPokemon.moveEntrySource !== "manual" && likelyMoves.length === 0) {
    return null;
  }

  return getBestMoveInto(attackerPokemon, defenderPokemon, {
    allowAvailableMoves: false,
  });
}

function getOffensiveScore(myPokemon, opponentPokemon) {
  const bestMove = getBestMoveInto(myPokemon, opponentPokemon);

  if (!bestMove) return 0;

  let score = bestMove.score;

  if (bestMove.effectiveness >= 4) score += 2.2;
  else if (bestMove.effectiveness >= 2) score += 1.4;
  else if (bestMove.effectiveness === 0) score -= 2.2;

  return score;
}

function getDefensiveScore(myPokemon, opponentPokemon) {
  const opponentBestMove = getBestThreatMoveInto(opponentPokemon, myPokemon);

  if (!opponentBestMove) {
    return 0;
  }

  let score = 0;

  if (opponentBestMove.effectiveness >= 4) score -= 4.2;
  else if (opponentBestMove.effectiveness >= 2) score -= 2.5;
  else if (opponentBestMove.effectiveness <= 0.5 && opponentBestMove.effectiveness > 0) score += 0.55;
  else if (opponentBestMove.effectiveness === 0) score += 1.2;

  if (isPriorityMove(opponentBestMove.name)) {
    score -= 0.9;
  }

  return score;
}

function getBaseRoleLabel(pokemon) {
  const roles = [];
  const damagingMoves = (pokemon.moves || [])
    .map(getMoveData)
    .filter((move) => move?.power);

  const strongCoverageCount = damagingMoves.filter((move) => move.power >= 80).length;

  if (hasSetupMove(pokemon) && hasPriorityMove(pokemon)) {
    roles.push("Cleaner");
    roles.push("Setup");
  } else if (hasSetupMove(pokemon)) {
    roles.push("Setup Threat");
  }

  if (hasPivotMove(pokemon)) roles.push("Pivot");
  if (hasPriorityMove(pokemon) && !roles.includes("Cleaner")) roles.push("Cleaner");

  if (strongCoverageCount >= 2 && !roles.includes("Setup Threat") && !roles.includes("Cleaner")) {
    roles.push("Breaker");
  }

  if (hasRecoveryMove(pokemon) && roles.length < 2 && pokemon.moveEntrySource === "manual") {
    roles.push("Sustain");
  }

  if (roles.length === 0 && damagingMoves.length > 0) {
    roles.push("Attacker");
  }

  return roles.slice(0, 2).join(" / ") || "Flexible";
}

function groupWarnings(warnings = []) {
  const grouped = new Map();

  for (const warning of warnings) {
    const key = warning.source;

    if (!grouped.has(key)) {
      grouped.set(key, {
        source: warning.source,
        moves: new Set(),
        texts: [],
      });
    }

    const entry = grouped.get(key);

    if (warning.move) entry.moves.add(warning.move);
    entry.texts.push(warning.text);
  }

  return [...grouped.values()]
    .map((entry) => {
      const megaOnlyMoves = ["Solar Beam"];
      const conditionalMoves = ["Weather Ball", "Growth"];

      const moves = [...entry.moves]
        .filter((move) => !megaOnlyMoves.includes(move))
        .slice(0, 2);

      const moveText = moves.join(" / ");
      const isConditional = moves.some((move) => conditionalMoves.includes(move));

      return {
        source: entry.source,
        text: moveText
          ? isConditional
            ? `${entry.source} can threaten with ${moveText} under specific conditions`
            : `${entry.source} threatens with ${moveText}`
          : entry.texts[0],
      };
    })
    .filter((entry) => entry.text && !entry.text.includes("Solar Beam"));
}

function scoreMatchup(myPokemon, opponentTeam) {
  if (!opponentTeam.length) {
    return {
      ...myPokemon,
      score: 0,
      warnings: [],
      fieldRisks: [],
      role: getBaseRoleLabel(myPokemon),
    };
  }

  let totalScore = 0;
  const warnings = [];
  const fieldRisks = [];

  for (const opponent of opponentTeam) {
    if (!opponent) continue;

    const offensiveScore = getOffensiveScore(myPokemon, opponent);
    const defensiveScore = getDefensiveScore(myPokemon, opponent);
    const bestMove = getBestMoveInto(myPokemon, opponent);
    const opponentBestMove = getBestThreatMoveInto(opponent, myPokemon);

    totalScore += offensiveScore + defensiveScore;

    if (bestMove?.effectiveness >= 2) {
      totalScore += 0.55;
    }

    if (opponentBestMove?.effectiveness >= 2) {
      warnings.push({
        source: displayPokemonName(opponent),
        text: `Threatens with ${opponentBestMove.name}`,
        move: opponentBestMove.name,
      });
    }

    if (hasSetupMove(opponent)) {
      const setupMove = getFirstMoveByRule(opponent, "setup");
      fieldRisks.push(
        `${displayPokemonName(opponent)} can snowball with ${setupMove || "setup"} if given a free turn`
      );
      totalScore -= 0.45;
    }

    if (hasPriorityMove(opponent)) {
      const priorityMove = getFirstMoveByRule(opponent, "priority");
      warnings.push({
        source: displayPokemonName(opponent),
        text: `Can clean weakened targets with ${priorityMove || "priority"}`,
        move: priorityMove || "priority",
      });
      totalScore -= 0.25;
    }
  }

  if (hasPriorityMove(myPokemon)) totalScore += 0.75;
  if (hasPivotMove(myPokemon)) totalScore += 1.15;
  if (hasSetupMove(myPokemon)) totalScore += 0.35;
  if (hasRecoveryMove(myPokemon) && myPokemon.moveEntrySource === "manual") totalScore += 0.15;

  const normalizedScore = totalScore / opponentTeam.length;
  const widenedScore = normalizedScore * 1.55;

  return {
    ...myPokemon,
    score: Math.round(widenedScore * 10) / 10,
    warnings: groupWarnings(warnings).slice(0, 4),
    fieldRisks: [...new Set(fieldRisks)].slice(0, 4),
    role: getBaseRoleLabel(myPokemon),
  };
}

function finalizeChosenThree(chosenThree) {
  const firstSetupIndex = chosenThree.findIndex(hasSetupMove);

  return chosenThree.map((pokemon, index) => {
    if (!hasSetupMove(pokemon)) {
      return pokemon;
    }

    if (index === firstSetupIndex) {
      return {
        ...pokemon,
        role: hasPriorityMove(pokemon) ? "Primary Cleaner" : "Primary Win Condition",
      };
    }

    return {
      ...pokemon,
      role: hasPriorityMove(pokemon) ? "Cleaner / Setup" : "Secondary Setup",
    };
  });
}

function getLeadScore(pokemon, opponentTeam) {
  let leadScore = pokemon.score;

  if (hasPivotMove(pokemon)) leadScore += 2.2;
  if (hasPriorityMove(pokemon)) leadScore += 0.25;
  if (hasSetupMove(pokemon)) leadScore -= 0.9;
  if (hasRecoveryMove(pokemon)) leadScore -= 0.2;

  const scaryLeadThreats = opponentTeam.filter((opponent) => {
    const threatMove = getBestThreatMoveInto(opponent, pokemon);
    return threatMove?.effectiveness >= 2;
  });

  leadScore -= scaryLeadThreats.length * 0.8;

  return leadScore;
}

function chooseLead(bestThree, opponentTeam) {
  if (!bestThree.length) return "";

  const sorted = [...bestThree].sort(
    (a, b) => getLeadScore(b, opponentTeam) - getLeadScore(a, opponentTeam)
  );

  return sorted[0]?.name || "";
}

function orderBestThreeWithLead(bestThree, lead) {
  if (!lead) return bestThree;

  const leadPick = bestThree.find((pokemon) => pokemon.name === lead);
  const others = bestThree.filter((pokemon) => pokemon.name !== lead);

  return leadPick ? [leadPick, ...others].slice(0, 3) : bestThree;
}

function getStablePhrase(options, seed) {
  if (!options.length) return "";
  const index = normalizeText(seed).length % options.length;
  return options[index];
}

function getTurnOneAction(leadPokemon, opponentPokemon) {
  if (!leadPokemon || !opponentPokemon) {
    return "Scout safely and look to pivot";
  }

  const bestMove = getBestMoveInto(leadPokemon, opponentPokemon);
  const opponentThreatMove = getBestThreatMoveInto(opponentPokemon, leadPokemon);
  const pivotMove = getFirstMoveByRule(leadPokemon, "pivot");
  const opponentSetupMove = getFirstMoveByRule(opponentPokemon, "setup");
  const opponentPriorityMove = getFirstMoveByRule(opponentPokemon, "priority");

  if (opponentSetupMove && bestMove?.score > 1) {
    return `Pressure with ${bestMove.name} and stop ${opponentSetupMove}`;
  }

  if (opponentThreatMove?.effectiveness >= 2 && pivotMove) {
    return `Respect ${opponentThreatMove.name} and pivot with ${pivotMove}`;
  }

  if (opponentThreatMove?.effectiveness >= 2) {
    return `Respect ${opponentThreatMove.name} and avoid a bad early trade`;
  }

  if (opponentPriorityMove && bestMove?.effectiveness < 2) {
    return `Avoid unnecessary chip and respect ${opponentPriorityMove}`;
  }

  if (bestMove?.effectiveness >= 2) {
    return getStablePhrase(
      [
        `Pressure with ${bestMove.name}`,
        `Open with ${bestMove.name}`,
        `Force damage early with ${bestMove.name}`,
        `Lead aggression with ${bestMove.name}`,
      ],
      `${leadPokemon.name}${opponentPokemon.name}${bestMove.name}`
    );
  }

  if (pivotMove) {
    return `Create early pressure, then pivot with ${pivotMove}`;
  }

  if (bestMove) {
    return `Neutral matchup, look for chip with ${bestMove.name}`;
  }

  return "Scout safely and look to pivot";
}

function getTurnOnePlan(leadPokemon, opponentTeam) {
  if (!leadPokemon) return [];

  return opponentTeam.map((opponent) => ({
    opponent: displayPokemonName(opponent),
    action: getTurnOneAction(leadPokemon, opponent),
  }));
}

function getBestTargetsForPokemon(pokemon, opponentTeam) {
  return opponentTeam
    .map((opponent) => ({
      opponent,
      move: getBestMoveInto(pokemon, opponent),
    }))
    .filter((entry) => entry.move)
    .sort((a, b) => b.move.score - a.move.score);
}

function getWinConditionDependency(pokemon, opponentTeam) {
  const checks = opponentTeam
    .map((opponent) => {
      const opponentBestMove = getBestThreatMoveInto(opponent, pokemon);
      const myBestMove = getBestMoveInto(pokemon, opponent);

      const threatensPokemon = opponentBestMove?.effectiveness >= 2;
      const resistsPokemon = !myBestMove || myBestMove.effectiveness < 1;

      if (threatensPokemon || resistsPokemon) {
        return displayPokemonName(opponent);
      }

      return null;
    })
    .filter(Boolean);

  const uniqueChecks = [...new Set(checks)];

  if (uniqueChecks.length === 0) return "";

  if (uniqueChecks.length === 1) {
    return ` once ${uniqueChecks[0]} is chipped or removed`;
  }

  return ` once ${uniqueChecks.slice(0, 2).join(" and ")} are chipped or removed`;
}

function buildWinConditions(chosenThree, opponentTeam, lead) {
  const lines = [];
  const setupMons = chosenThree.filter(hasSetupMove);
  const primaryWinCondition = setupMons[0] || null;

  for (const pokemon of chosenThree) {
    const bestTargets = getBestTargetsForPokemon(pokemon, opponentTeam);
    const bestStrongTarget = bestTargets.find((entry) => entry.move.effectiveness >= 2) || bestTargets[0];
    const role = pokemon.role || getBaseRoleLabel(pokemon);
    const setupMove = getFirstMoveByRule(pokemon, "setup");
    const pivotMove = getFirstMoveByRule(pokemon, "pivot");
    const priorityMove = getFirstMoveByRule(pokemon, "priority");

    if (pokemon.name === lead && pivotMove) {
      lines.push(
        `${pokemon.name} should lead, create pressure, then pivot with ${pivotMove}`
      );
      continue;
    }

    if (setupMove && primaryWinCondition?.name === pokemon.name) {
      lines.push(
        `${pokemon.name} is your main win condition${getWinConditionDependency(pokemon, opponentTeam)}. Find a safe ${setupMove} window before committing`
      );
      continue;
    }

    if (setupMove) {
      lines.push(
        `${pokemon.name} is a secondary setup threat${getWinConditionDependency(pokemon, opponentTeam)}. Only use ${setupMove} once checks are weakened`
      );
      continue;
    }

    if (priorityMove && bestStrongTarget) {
      lines.push(
        `${pokemon.name} can clean weakened targets with ${priorityMove} after ${displayPokemonName(bestStrongTarget.opponent)} is chipped or removed`
      );
      continue;
    }

    if (bestStrongTarget?.move?.effectiveness >= 2) {
      lines.push(
        `Use ${pokemon.name} to pressure ${displayPokemonName(bestStrongTarget.opponent)} with ${bestStrongTarget.move.name}`
      );
      continue;
    }

    if (bestStrongTarget) {
      lines.push(
        `Use ${pokemon.name} as a ${role.toLowerCase()} and take safe trades with ${bestStrongTarget.move.name}`
      );
    }
  }

  for (const opponent of opponentTeam) {
    const setupMove = getFirstMoveByRule(opponent, "setup");

    if (setupMove) {
      lines.push(`Do not give ${displayPokemonName(opponent)} a free ${setupMove} turn`);
    }
  }

  return [...new Set(lines)].slice(0, 3);
}

function findMegaRuleForPokemon(pokemon) {
  if (!pokemon) return null;

  const displayKey = displayPokemonName(pokemon);
  const nameKey = pokemon.name;

  return megaRules[displayKey] || megaRules[nameKey] || null;
}

function getCompactMegaName(megaName) {
  const name = String(megaName || "");

  if (name === "Mega Charizard Y") return "Mega Y";
  if (name === "Mega Charizard X") return "Mega X";

  return name.replace(/^Mega\s+/, "Mega ");
}

function getMegaPriority(mega) {
  const weight = Number(mega.metaWeight ?? 0.5);

  if (weight >= 0.9) return "High priority";
  if (weight >= 0.65) return "Medium priority";
  return "Low priority";
}

function getConditionalMegaRisks(opponentTeam, chosenThree) {
  const META_THRESHOLD = 0.5;
  const risks = [];

  for (const opponent of opponentTeam) {
    const rule = findMegaRuleForPokemon(opponent);
    if (!rule?.possibleMegas?.length) continue;

    const weightedMegas = rule.possibleMegas
      .map((mega) => ({
        ...mega,
        metaWeight: Number(mega.metaWeight ?? 0.5),
        metaTier: mega.metaTier || "Unknown",
      }))
      .filter((mega) => mega.metaWeight >= META_THRESHOLD)
      .sort((a, b) => b.metaWeight - a.metaWeight);

    for (const mega of weightedMegas) {
      const impactedTeamMembers = [];

      for (const ally of chosenThree) {
        const enabledMoves = mega.enabledMoves || [];

        const dangerousEnabledMoves = enabledMoves
          .map((moveName) => {
            const move = getMoveData(moveName);
            if (!move?.type) return null;

            const effectiveness = getTypeEffectiveness(move.type, ally.types || []);
            return effectiveness >= 2 ? move.name : null;
          })
          .filter(Boolean);

        if (dangerousEnabledMoves.length > 0) {
          impactedTeamMembers.push(
            `${ally.name} via ${dangerousEnabledMoves.slice(0, 2).join(" / ")}`
          );
        }
      }

      const primaryNote =
        mega.riskNotes?.[0] ||
        `${mega.name} can change this matchup if revealed`;

      const priorityLabel = getMegaPriority(mega);
      const tierLabel = mega.metaTier && mega.metaTier !== "Unknown"
        ? `${mega.metaTier} tier`
        : "meta relevant";

      risks.push({
        pokemon: displayPokemonName(opponent),
        mega: mega.name,
        weight: mega.metaWeight,
        tier: mega.metaTier,
        text:
          impactedTeamMembers.length > 0
            ? `${priorityLabel}, ${tierLabel}: ${primaryNote}. Threatens ${impactedTeamMembers.slice(0, 2).join(", ")} if revealed.`
            : `${priorityLabel}, ${tierLabel}: ${primaryNote}.`,
      });
    }
  }

  return risks
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 6);
}

function cleanRiskText(text, source) {
  return String(text || "")
    .replace(new RegExp(`^${source}\\s+`, "i"), "")
    .replace(/^threatens\s+/i, "")
    .replace(/^can threaten\s+/i, "")
    .replace(/^with\s+/i, "")
    .replace(/^threatens with\s+/i, "")
    .replace(/^can threaten with\s+/i, "")
    .trim();
}

function normaliseRiskText(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

function titleCaseMoveText(text) {
  return String(text || "")
    .split(" ")
    .map((word) => (word ? `${word[0].toUpperCase()}${word.slice(1)}` : word))
    .join(" ");
}

function splitRiskMoves(text) {
  return String(text || "")
    .split("/")
    .map((move) => move.trim())
    .filter(Boolean);
}

function buildGroupedRisks(chosenThree) {
  const targetPriority = new Map(
    chosenThree.map((pokemon, index) => [pokemon.name, index])
  );

  const rawRisks = [];

  for (const pokemon of chosenThree) {
    for (const warning of pokemon.warnings || []) {
      rawRisks.push({
        source: warning.source,
        target: pokemon.name,
        text: warning.text,
      });
    }
  }

  const grouped = new Map();

  for (const risk of rawRisks) {
    const key = risk.source;

    if (!grouped.has(key)) {
      grouped.set(key, {
        source: risk.source,
        targets: new Set(),
        threatTexts: new Map(),
      });
    }

    const entry = grouped.get(key);
    entry.targets.add(risk.target);

    const cleanedText = cleanRiskText(risk.text, risk.source);

    for (const moveText of splitRiskMoves(cleanedText)) {
      const normalisedText = normaliseRiskText(moveText);

      if (normalisedText && !entry.threatTexts.has(normalisedText)) {
        entry.threatTexts.set(normalisedText, moveText);
      }
    }
  }

  return [...grouped.values()]
    .map((risk) => ({
      source: risk.source,
      targets: [...risk.targets].sort(
        (a, b) => (targetPriority.get(a) ?? 99) - (targetPriority.get(b) ?? 99)
      ),
      threatTexts: [...risk.threatTexts.values()],
      priority: Math.min(
        ...[...risk.targets].map((target) => targetPriority.get(target) ?? 99)
      ),
    }))
    .sort((a, b) => a.priority - b.priority || a.source.localeCompare(b.source))
    .slice(0, 6);
}

function buildFieldRisks(chosenThree) {
  const allFieldRisks = chosenThree.flatMap((pokemon) => pokemon.fieldRisks || []);
  return [...new Set(allFieldRisks)];
}

function summarizeRisk(entry) {
  if (!entry?.targets?.length) return "";

  const targetText = entry.targets.slice(0, 2).join(" / ");
  const threatText = [...new Set(entry.threatTexts || [])]
    .slice(0, 2)
    .map(titleCaseMoveText)
    .join(" / ");

  return threatText ? `${targetText}: ${threatText}` : targetText;
}

const styles = {
  page: {
    padding: "20px 20px 28px",
    fontFamily: "Arial, sans-serif",
    maxWidth: "1280px",
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
  const [selectedOpponentPokemon, setSelectedOpponentPokemon] = useState([]);
  const [opponentTeam, setOpponentTeam] = useState([]);
  const [bestThree, setBestThree] = useState([]);
  const [lead, setLead] = useState("");
  const [risksByPokemon, setRisksByPokemon] = useState([]);
  const [fieldRisks, setFieldRisks] = useState([]);
  const [conditionalMegaRisks, setConditionalMegaRisks] = useState([]);
  const [turnPlan, setTurnPlan] = useState([]);
  const [winConditions, setWinConditions] = useState([]);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const myTeam = buildMyTeamFromBuilder(builderTeam);
  const orderedBestThree = orderBestThreeWithLead(bestThree, lead);
  const shouldShowAnalyzedOpponentTeam =
    selectedOpponentPokemon.length === 0 && opponentTeam.length > 0;

  const handleOpponentChange = (nextPokemon) => {
    setSelectedOpponentPokemon(nextPokemon);

    if (nextPokemon.length !== 6) {
      setHasAnalyzed(false);
      setOpponentTeam([]);
      setBestThree([]);
      setLead("");
      setRisksByPokemon([]);
      setFieldRisks([]);
      setConditionalMegaRisks([]);
      setTurnPlan([]);
      setWinConditions([]);
    }
  };

  const handleAnalyze = () => {
    const foundTeam = selectedOpponentPokemon
      .map((pokemon) => hydratePokemon(pokemon))
      .filter(Boolean)
      .slice(0, 6);

    const ranked = myTeam
      .map((pokemon) => scoreMatchup(pokemon, foundTeam))
      .sort((a, b) => b.score - a.score);

    const chosenThree = finalizeChosenThree(ranked.slice(0, 3));
    const chosenLead = chooseLead(chosenThree, foundTeam);
    const leadPokemon = chosenThree.find((pokemon) => pokemon.name === chosenLead);

    const groupedRisks = buildGroupedRisks(chosenThree);
    const globalFieldRisks = buildFieldRisks(chosenThree);
    const megaRisks = getConditionalMegaRisks(foundTeam, chosenThree);
    const plans = getTurnOnePlan(leadPokemon, foundTeam);
    const wins = buildWinConditions(chosenThree, foundTeam, chosenLead);

    setOpponentTeam(foundTeam);
    setBestThree(chosenThree);
    setLead(chosenLead);
    setRisksByPokemon(groupedRisks);
    setFieldRisks(globalFieldRisks);
    setConditionalMegaRisks(megaRisks);
    setTurnPlan(plans);
    setWinConditions(wins);
    setHasAnalyzed(true);
  };

  return (
    <div style={styles.page}>
      <h1 style={styles.title}>Pokémon Champions Assistant</h1>
      <p style={styles.subtitle}>Search and click the opponent&apos;s Pokémon...</p>

      <TeamBuilder team={builderTeam} setTeam={setBuilderTeam} />

      <PokemonSearchPicker
        pokemonData={pokemonData}
        selectedPokemon={selectedOpponentPokemon}
        setSelectedPokemon={handleOpponentChange}
        normalizeText={normalizeText}
        hasAnalyzed={hasAnalyzed}
      />

      <div style={styles.buttonWrap}>
        <button
          onClick={handleAnalyze}
          style={{
            ...styles.button,
            opacity: selectedOpponentPokemon.length === 6 ? 1 : 0.55,
            cursor: selectedOpponentPokemon.length === 6 ? "pointer" : "not-allowed",
          }}
          disabled={selectedOpponentPokemon.length !== 6}
        >
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

                <strong>{displayPokemonName(pokemon)}</strong>
                <br />

                <span style={{ fontSize: "13px", opacity: 0.9 }}>
                  {(pokemon.types || []).join(", ")}
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
                  <div style={styles.bestMeta}>{(pokemon.types || []).join(", ")}</div>
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
                <div style={styles.turnVs}>{entry.source}</div>
                <div style={styles.turnAction}>{summarizeRisk(entry)}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div style={styles.section}>
        <h2 style={styles.sectionTitle}>Potential Mega Threats</h2>
        {conditionalMegaRisks.length === 0 ? (
          <p style={styles.emptyText}>No major Mega threats flagged.</p>
        ) : (
          <div style={styles.turnGrid}>
            {conditionalMegaRisks.map((risk, index) => (
              <div key={index} style={styles.turnCard}>
                <div style={styles.turnVs}>{risk.pokemon} ({getCompactMegaName(risk.mega)})</div>
                <div style={styles.turnAction}>{risk.text}</div>
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
