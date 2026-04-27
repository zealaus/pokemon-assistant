import { useMemo, useState } from "react";

function displayPokemonName(pokemon) {
  if (!pokemon) return "";
  return pokemon.displayName || (pokemon.form ? `${pokemon.name} (${pokemon.form})` : pokemon.name);
}

function getSpriteForPokemon(pokemon) {
  return pokemon?.sprite || "";
}

const styles = {
  wrapper: { marginBottom: "24px" },
  title: { fontSize: "15px", fontWeight: 700, textAlign: "center", marginBottom: "10px" },
  search: {
    width: "100%",
    padding: "13px 14px",
    borderRadius: "10px",
    border: "1px solid #555",
    background: "#1a1a24",
    color: "#fff",
    fontSize: "15px",
    boxSizing: "border-box",
    marginBottom: "14px",
  },
  selectedLabel: { textAlign: "center", opacity: 0.72, fontSize: "12px", marginBottom: "10px" },
  selectedGrid: { display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "12px" },
  selectedCard: {
    border: "1px solid #ccc",
    borderRadius: "10px",
    padding: "8px 10px",
    minWidth: "150px",
    minHeight: "102px",
    textAlign: "center",
    boxSizing: "border-box",
    cursor: "pointer",
    background: "#15151d",
  },
  selectedEmpty: {
    border: "1px dashed #555",
    borderRadius: "10px",
    padding: "8px 10px",
    minWidth: "150px",
    minHeight: "42px",
    textAlign: "center",
    boxSizing: "border-box",
    opacity: 0.55,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  sprite: { width: "54px", height: "54px", objectFit: "contain", imageRendering: "pixelated", marginBottom: "4px" },
  name: { fontWeight: 700, marginBottom: "4px" },
  type: { fontSize: "13px", opacity: 0.85 },
  hint: { textAlign: "center", opacity: 0.72, fontSize: "12px", margin: "8px 0 12px" },
  count: { textAlign: "center", opacity: 0.72, fontSize: "12px", marginBottom: "10px" },
  gridWrap: {
    maxHeight: "430px",
    overflowY: "auto",
    padding: "4px 6px",
    borderTop: "1px solid rgba(255,255,255,0.07)",
    borderBottom: "1px solid rgba(255,255,255,0.07)",
  },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(118px, 1fr))", gap: "8px" },
  optionCard: {
    border: "1px solid #44475a",
    borderRadius: "10px",
    padding: "8px",
    minHeight: "96px",
    textAlign: "center",
    boxSizing: "border-box",
    cursor: "pointer",
    background: "#15151d",
  },
  optionCardSelected: { borderColor: "#45c26b", boxShadow: "0 0 0 1px rgba(69, 194, 107, 0.35)" },
  optionName: { fontSize: "12px", opacity: 0.9 },
  collapsed: { textAlign: "center", opacity: 0.72, fontSize: "12px", marginTop: "8px" },
  smallActions: { textAlign: "center", marginTop: "10px" },
  clearButton: {
    padding: "7px 12px",
    borderRadius: "9px",
    border: "1px solid #666",
    background: "#20202b",
    color: "#fff",
    cursor: "pointer",
    fontWeight: 600,
    fontSize: "12px",
  },
};

export default function PokemonSearchPicker({
  pokemonData,
  selectedPokemon,
  setSelectedPokemon,
  normalizeText,
  hasAnalyzed = false,
}) {
  const [search, setSearch] = useState("");

  const selectedKeys = useMemo(() => {
    return new Set(selectedPokemon.map((pokemon) => normalizeText(pokemon.displayName || pokemon.slug || pokemon.name)));
  }, [selectedPokemon, normalizeText]);

  const playablePokemon = useMemo(() => {
    return pokemonData.filter((pokemon) => pokemon.normallyAvailable !== false);
  }, [pokemonData]);

  const filteredPokemon = useMemo(() => {
    const query = normalizeText(search);

    if (!query) return playablePokemon;

    return playablePokemon.filter((pokemon) => {
      const searchValues = [
        pokemon.name,
        pokemon.displayName,
        pokemon.slug,
        pokemon.form,
        ...(pokemon.aliases || []),
      ];

      return searchValues.some((value) => normalizeText(value).includes(query));
    });
  }, [playablePokemon, search, normalizeText]);

  const isTeamFull = selectedPokemon.length >= 6;
  const shouldShowGrid = !hasAnalyzed && !isTeamFull;

  function addPokemon(pokemon) {
    if (isTeamFull) return;

    const key = normalizeText(pokemon.displayName || pokemon.slug || pokemon.name);
    if (selectedKeys.has(key)) return;

    setSelectedPokemon([...selectedPokemon, pokemon].slice(0, 6));
    setSearch("");
  }

  function removePokemon(indexToRemove) {
    setSelectedPokemon(selectedPokemon.filter((_, index) => index !== indexToRemove));
  }

  function clearTeam() {
    setSelectedPokemon([]);
    setSearch("");
  }

  function handleSearchKeyDown(event) {
    if (event.key !== "Enter") return;

    const firstMatch = filteredPokemon.find((pokemon) => {
      const key = normalizeText(pokemon.displayName || pokemon.slug || pokemon.name);
      return !selectedKeys.has(key);
    });

    if (firstMatch) addPokemon(firstMatch);
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.title}>Opponent Search</div>

      <input
        value={search}
        onChange={(event) => setSearch(event.target.value)}
        onKeyDown={handleSearchKeyDown}
        placeholder="Search Pokémon, nickname, or alias"
        style={styles.search}
        disabled={isTeamFull && !hasAnalyzed}
      />

      <div style={styles.selectedLabel}>Opponent Team</div>

      <div style={styles.selectedGrid}>
        {Array.from({ length: 6 }).map((_, index) => {
          const pokemon = selectedPokemon[index];

          if (!pokemon) {
            return <div key={index} style={styles.selectedEmpty}>Empty slot</div>;
          }

          return (
            <div
              key={`${pokemon.slug || pokemon.name}-${index}`}
              style={styles.selectedCard}
              onClick={() => removePokemon(index)}
              title="Click to remove"
            >
              {getSpriteForPokemon(pokemon) && (
                <img src={getSpriteForPokemon(pokemon)} alt={displayPokemonName(pokemon)} style={styles.sprite} />
              )}

              <div style={styles.name}>{displayPokemonName(pokemon)}</div>
              <div style={styles.type}>{(pokemon.types || []).join(", ")}</div>
            </div>
          );
        })}
      </div>

      {selectedPokemon.length > 0 && <div style={styles.hint}>Click a selected Pokémon to remove it.</div>}

      {shouldShowGrid ? (
        <>
          <div style={styles.count}>Showing {filteredPokemon.length} playable Pokémon</div>

          <div style={styles.gridWrap}>
            <div style={styles.grid}>
              {filteredPokemon.map((pokemon) => {
                const key = normalizeText(pokemon.displayName || pokemon.slug || pokemon.name);
                const selected = selectedKeys.has(key);

                return (
                  <button
                    key={pokemon.slug || pokemon.displayName || pokemon.name}
                    type="button"
                    style={{
                      ...styles.optionCard,
                      ...(selected ? styles.optionCardSelected : {}),
                      opacity: selected ? 0.55 : 1,
                      cursor: selected ? "not-allowed" : "pointer",
                    }}
                    onClick={() => addPokemon(pokemon)}
                    disabled={selected}
                  >
                    {getSpriteForPokemon(pokemon) && (
                      <img src={getSpriteForPokemon(pokemon)} alt={displayPokemonName(pokemon)} style={styles.sprite} />
                    )}
                    <div style={styles.optionName}>{displayPokemonName(pokemon)}</div>
                  </button>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <div style={styles.collapsed}>
          {hasAnalyzed
            ? "Opponent team locked for this analysis. Click a selected Pokémon to edit."
            : "Opponent team full. Click a selected Pokémon to remove one."}
        </div>
      )}

      {selectedPokemon.length > 0 && (
        <div style={styles.smallActions}>
          <button type="button" style={styles.clearButton} onClick={clearTeam}>
            Clear Opponent Team
          </button>
        </div>
      )}
    </div>
  );
}
