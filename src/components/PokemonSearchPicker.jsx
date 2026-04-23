import { useEffect, useMemo, useRef, useState } from "react";

const COLLAPSED_SPECIES = {
  Alcremie: "alcremie-vanilla-cream",
  Florges: "florges-red-flower",
  Maushold: "maushold-family-of-four",
  Polteageist: "polteageist-phony-form",
  Sinistcha: "sinistcha-unremarkable-form",
  Furfrou: "furfrou",
};

function buildPickerList(spriteData) {
  const grouped = new Map();

  for (const pokemon of spriteData) {
    if (!grouped.has(pokemon.name)) {
      grouped.set(pokemon.name, []);
    }
    grouped.get(pokemon.name).push(pokemon);
  }

  const finalList = [];

  for (const [name, entries] of grouped.entries()) {
    const preferredSlug = COLLAPSED_SPECIES[name];

    if (preferredSlug) {
      const preferred =
        entries.find((entry) => entry.slug === preferredSlug) || entries[0];

      finalList.push({
        ...preferred,
        displayName: name,
      });

      continue;
    }

    for (const entry of entries) {
      finalList.push({
        ...entry,
        displayName: entry.form ? `${entry.name} (${entry.form})` : entry.name,
      });
    }
  }

  return finalList.sort((a, b) => {
    const nameCompare = a.displayName.localeCompare(b.displayName);
    if (nameCompare !== 0) return nameCompare;
    return a.slug.localeCompare(b.slug);
  });
}

export default function PokemonSearchPicker({
  spriteData,
  selectedPokemon,
  setSelectedPokemon,
  normalizeText,
}) {
  const [query, setQuery] = useState("");
  const [hoveredSlug, setHoveredSlug] = useState(null);
  const searchInputRef = useRef(null);

  const pickerPokemon = useMemo(() => {
    return buildPickerList(spriteData);
  }, [spriteData]);

  const filteredPokemon = useMemo(() => {
    const q = normalizeText(query);

    return pickerPokemon.filter((pokemon) => {
      const isSelected = selectedPokemon.some(
        (entry) => entry.slug === pokemon.slug
      );

      if (isSelected) return false;

      if (!q) return true;

      return (
        normalizeText(pokemon.name).includes(q) ||
        normalizeText(pokemon.displayName).includes(q) ||
        normalizeText(pokemon.slug).includes(q) ||
        (pokemon.aliases || []).some((alias) =>
          normalizeText(alias).includes(q)
        )
      );
    });
  }, [query, pickerPokemon, selectedPokemon, normalizeText]);

  useEffect(() => {
    if (selectedPokemon.length < 6) {
      searchInputRef.current?.focus();
    }
  }, [selectedPokemon]);

  function handleAddPokemon(pokemon) {
    if (selectedPokemon.length >= 6) return;

    const alreadySelected = selectedPokemon.some(
      (entry) => entry.slug === pokemon.slug
    );

    if (alreadySelected) return;

    setSelectedPokemon([...selectedPokemon, pokemon]);
    setQuery("");
    setHoveredSlug(null);
  }

  function handleRemovePokemon(slug) {
    setSelectedPokemon(
      selectedPokemon.filter((pokemon) => pokemon.slug !== slug)
    );
  }

  function handleSearchKeyDown(event) {
    if (event.key === "Enter") {
      event.preventDefault();

      if (selectedPokemon.length >= 6) return;
      if (filteredPokemon.length === 0) return;

      handleAddPokemon(filteredPokemon[0]);
    }
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
      gridTemplateColumns: "repeat(auto-fill, minmax(100px, 1fr))",
      gap: "8px",
      maxHeight: "420px",
      overflowY: "auto",
      padding: "6px",
      border: "1px solid #3d3d4d",
      borderRadius: "12px",
    },
    spriteCard: {
      border: "1px solid #4d4d5f",
      borderRadius: "10px",
      padding: "10px 8px",
      textAlign: "center",
      cursor: "pointer",
      background: "#181821",
      transition: "transform 0.15s ease, border-color 0.15s ease, background 0.15s ease",
    },
    spriteCardHover: {
      border: "1px solid #7a7a96",
      background: "#20202b",
      transform: "translateY(-1px)",
    },
    spriteImage: {
      width: "56px",
      height: "56px",
      objectFit: "contain",
      imageRendering: "pixelated",
    },
    spriteName: {
      fontSize: "11px",
      marginTop: "6px",
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
    resultCount: {
      textAlign: "center",
      opacity: 0.72,
      fontSize: "12px",
      marginBottom: "8px",
    },
    noResults: {
      textAlign: "center",
      opacity: 0.72,
      fontSize: "12px",
      padding: "14px 8px",
      border: "1px solid #3d3d4d",
      borderRadius: "12px",
    },
  };

  return (
    <div style={pickerStyles.wrapper}>
      <h2 style={pickerStyles.sectionTitle}>Opponent Search</h2>

      <input
        ref={searchInputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleSearchKeyDown}
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
                <div style={pickerStyles.selectedName}>
                  {pokemon.displayName || pokemon.name}
                </div>
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
        <>
          <div style={pickerStyles.resultCount}>
            Showing {filteredPokemon.length} playable Pokémon
          </div>

          {filteredPokemon.length === 0 ? (
            <div style={pickerStyles.noResults}>
              No matching Pokémon found.
            </div>
          ) : (
            <div style={pickerStyles.spriteGrid}>
              {filteredPokemon.map((pokemon) => {
                const isHovered = hoveredSlug === pokemon.slug;

                return (
                  <div
                    key={pokemon.slug}
                    style={{
                      ...pickerStyles.spriteCard,
                      ...(isHovered ? pickerStyles.spriteCardHover : {}),
                    }}
                    onClick={() => handleAddPokemon(pokemon)}
                    onMouseEnter={() => setHoveredSlug(pokemon.slug)}
                    onMouseLeave={() => setHoveredSlug(null)}
                    title={`Add ${pokemon.displayName || pokemon.name}`}
                  >
                    <img
                      src={pokemon.sprite}
                      alt={pokemon.name}
                      style={pickerStyles.spriteImage}
                    />
                    <div style={pickerStyles.spriteName}>
                      {pokemon.displayName || pokemon.name}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}
    </div>
  );
}