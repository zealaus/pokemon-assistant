import { useMemo, useState } from "react";

export default function PokemonSearchPicker({
  spriteData,
  selectedPokemon,
  setSelectedPokemon,
  normalizeText,
}) {
  const [query, setQuery] = useState("");

  const filteredPokemon = useMemo(() => {
    const q = normalizeText(query);

    const baseList = spriteData.filter((pokemon) => {
      if (!q) return true;

      return (
        normalizeText(pokemon.name).includes(q) ||
        normalizeText(pokemon.slug).includes(q) ||
        (pokemon.aliases || []).some((alias) =>
          normalizeText(alias).includes(q)
        )
      );
    });

    return baseList
      .sort((a, b) => {
        const nameCompare = a.name.localeCompare(b.name);
        if (nameCompare !== 0) return nameCompare;

        return (a.form || "").localeCompare(b.form || "");
      })
      .slice(0, 60);
  }, [query, spriteData, normalizeText]);

  function handleAddPokemon(pokemon) {
    if (selectedPokemon.length >= 6) return;

    const alreadySelected = selectedPokemon.some(
      (entry) => entry.slug === pokemon.slug
    );

    if (alreadySelected) return;

    setSelectedPokemon([...selectedPokemon, pokemon]);
    setQuery("");
  }

  function handleRemovePokemon(slug) {
    setSelectedPokemon(
      selectedPokemon.filter((pokemon) => pokemon.slug !== slug)
    );
  }

  const pickerStyles = {
    wrapper: {
      marginBottom: "22px",
    },
    sectionTitle: {
      fontSize: "15px",
      fontWeight: 700,
      textAlign: "center",
      marginBottom: "10px",
    },
    searchInput: {
      width: "100%",
      marginBottom: "12px",
      padding: "12px 14px",
      borderRadius: "10px",
      border: "1px solid #555",
      background: "#1a1a24",
      color: "#fff",
      fontSize: "15px",
      boxSizing: "border-box",
    },
    selectedWrap: {
      marginBottom: "12px",
    },
    selectedGrid: {
      display: "flex",
      flexWrap: "wrap",
      gap: "8px",
      justifyContent: "center",
    },
    selectedCard: {
      border: "1px solid #ccc",
      borderRadius: "10px",
      padding: "8px 10px",
      minWidth: "118px",
      textAlign: "center",
      boxSizing: "border-box",
      position: "relative",
      cursor: "pointer",
    },
    selectedEmpty: {
      border: "1px dashed #777",
      borderRadius: "10px",
      padding: "8px 10px",
      minWidth: "118px",
      textAlign: "center",
      boxSizing: "border-box",
      opacity: 0.55,
    },
    selectedName: {
      fontWeight: 700,
      fontSize: "13px",
      marginTop: "4px",
    },
    selectedHint: {
      fontSize: "11px",
      opacity: 0.7,
      marginTop: "3px",
    },
    spriteGrid: {
      display: "grid",
      gridTemplateColumns: "repeat(auto-fill, minmax(92px, 1fr))",
      gap: "8px",
      maxHeight: "320px",
      overflowY: "auto",
      padding: "6px",
      border: "1px solid #3d3d4d",
      borderRadius: "12px",
    },
    spriteCard: {
      border: "1px solid #4d4d5f",
      borderRadius: "10px",
      padding: "8px 6px",
      textAlign: "center",
      cursor: "pointer",
      background: "#181821",
    },
    spriteCardDisabled: {
      border: "1px solid #333",
      borderRadius: "10px",
      padding: "8px 6px",
      textAlign: "center",
      cursor: "default",
      background: "#14141b",
      opacity: 0.45,
    },
    spriteImage: {
      width: "44px",
      height: "44px",
      objectFit: "contain",
      imageRendering: "pixelated",
    },
    spriteName: {
      fontSize: "11px",
      marginTop: "4px",
      lineHeight: 1.2,
    },
    helperText: {
      textAlign: "center",
      opacity: 0.7,
      fontSize: "12px",
      marginBottom: "10px",
    },
    fullTeamMessage: {
      textAlign: "center",
      opacity: 0.8,
      fontSize: "12px",
      marginTop: "6px",
      marginBottom: "6px",
    },
  };

  return (
    <div style={pickerStyles.wrapper}>
      <h2 style={pickerStyles.sectionTitle}>Opponent Search</h2>

      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search Pokémon, nickname, or alias"
        style={pickerStyles.searchInput}
      />

      <div style={pickerStyles.selectedWrap}>
        <div style={pickerStyles.helperText}>
          Selected opponent team. Click a selected Pokémon to remove it.
        </div>

        <div style={pickerStyles.selectedGrid}>
          {Array.from({ length: 6 }).map((_, index) => {
            const pokemon = selectedPokemon[index];

            if (!pokemon) {
              return (
                <div key={index} style={pickerStyles.selectedEmpty}>
                  Empty slot
                </div>
              );
            }

            return (
              <div
                key={pokemon.slug}
                style={pickerStyles.selectedCard}
                onClick={() => handleRemovePokemon(pokemon.slug)}
                title="Click to remove"
              >
                <img
                  src={pokemon.sprite}
                  alt={pokemon.name}
                  style={pickerStyles.spriteImage}
                />
                <div style={pickerStyles.selectedName}>{pokemon.name}</div>
                <div style={pickerStyles.selectedHint}>Click to remove</div>
              </div>
            );
          })}
        </div>
      </div>

      {selectedPokemon.length >= 6 ? (
        <div style={pickerStyles.fullTeamMessage}>
          Opponent team full. Click a selected Pokémon to remove one.
        </div>
      ) : (
        <div style={pickerStyles.spriteGrid}>
          {filteredPokemon.map((pokemon) => {
            const isSelected = selectedPokemon.some(
              (entry) => entry.slug === pokemon.slug
            );

            return (
              <div
                key={pokemon.slug}
                style={
                  isSelected
                    ? pickerStyles.spriteCardDisabled
                    : pickerStyles.spriteCard
                }
                onClick={() => {
                  if (!isSelected) handleAddPokemon(pokemon);
                }}
                title={isSelected ? "Already selected" : `Add ${pokemon.name}`}
              >
                <img
                  src={pokemon.sprite}
                  alt={pokemon.name}
                  style={pickerStyles.spriteImage}
                />
                <div style={pickerStyles.spriteName}>{pokemon.name}</div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}