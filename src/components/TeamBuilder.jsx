import { useState } from "react";
import myTeamData from "../data/my_team.json";
import spriteData from "../data/champions_sprites.json";
import rosterData from "../data/champions_roster_full.json";

const emptyMember = (slot) => ({
  slot,
  name: "",
  form: "",
  ability: "",
  item: "",
  nature: "",
  stats: {
    hp: "",
    attack: "",
    defense: "",
    spAttack: "",
    spDefense: "",
    speed: "",
  },
  moves: ["", "", "", ""],
});

function normalizeText(value) {
  return String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

function getSprite(name) {
  const match = spriteData.find(
    (pokemon) => normalizeText(pokemon.name) === normalizeText(name)
  );

  return match?.sprite || "";
}

function getTypes(name) {
  const match = rosterData.entries.find(
    (pokemon) => normalizeText(pokemon.name) === normalizeText(name)
  );

  return match?.types?.join(", ") || "";
}

function isTeamComplete(team) {
  return team.members.every((member) => member.name);
}

function convertMyTeamToBuilderTeam() {
  return {
    teamName: myTeamData.teamName || "James Current Team",
    format: myTeamData.format || "singles_3v3",
    members: Array.from({ length: 6 }, (_, index) => {
      const member = myTeamData.team?.[index];

      if (!member) return emptyMember(index + 1);

      return {
        slot: index + 1,
        name: member.name || "",
        form: member.form || "",
        ability: member.ability?.base || member.ability || "",
        item: member.item || member.megaItem || "",
        nature: member.statAlignment?.name || member.nature || "",
        stats: {
          hp: member.statPoints?.hp ?? "",
          attack: member.statPoints?.attack ?? "",
          defense: member.statPoints?.defense ?? "",
          spAttack: member.statPoints?.spAttack ?? "",
          spDefense: member.statPoints?.spDefense ?? "",
          speed: member.statPoints?.speed ?? "",
        },
        moves: [
          member.moves?.[0] || "",
          member.moves?.[1] || "",
          member.moves?.[2] || "",
          member.moves?.[3] || "",
        ],
      };
    }),
  };
}

export default function TeamBuilder() {
  const [team, setTeam] = useState({
    teamName: "My Team",
    format: "singles_3v3",
    members: Array.from({ length: 6 }, (_, i) => emptyMember(i + 1)),
  });

  const [isEditing, setIsEditing] = useState(true);
  const complete = isTeamComplete(team);

  function loadMyTeam() {
    setTeam(convertMyTeamToBuilderTeam());
    setIsEditing(false);
  }

  function clearTeam() {
    setTeam({
      teamName: "My Team",
      format: "singles_3v3",
      members: Array.from({ length: 6 }, (_, i) => emptyMember(i + 1)),
    });
    setIsEditing(true);
  }

  function updateMember(index, field, value) {
    const updated = [...team.members];

    updated[index] = {
      ...updated[index],
      [field]: value,
    };

    setTeam({ ...team, members: updated });
  }

  function updateStat(index, stat, value) {
    const updated = [...team.members];

    updated[index] = {
      ...updated[index],
      stats: {
        ...updated[index].stats,
        [stat]: value,
      },
    };

    setTeam({ ...team, members: updated });
  }

  function updateMove(index, moveIndex, value) {
    const updated = [...team.members];
    const moves = [...updated[index].moves];

    moves[moveIndex] = value;

    updated[index] = {
      ...updated[index],
      moves,
    };

    setTeam({ ...team, members: updated });
  }

  const styles = {
    wrapper: {
      marginBottom: "26px",
    },
    title: {
      textAlign: "center",
      marginBottom: "12px",
    },
    topBar: {
      display: "flex",
      gap: "8px",
      justifyContent: "center",
      marginBottom: "14px",
      flexWrap: "wrap",
    },
    teamName: {
      width: "100%",
      maxWidth: "700px",
      background: "#2b2b2b",
      color: "#fff",
      border: "1px solid #666",
      borderRadius: "4px",
      padding: "5px 7px",
      boxSizing: "border-box",
    },
    button: {
      background: "#20202b",
      color: "#fff",
      border: "1px solid #777",
      borderRadius: "8px",
      padding: "8px 12px",
      cursor: "pointer",
      fontWeight: 700,
    },
    summaryGrid: {
      display: "flex",
      flexWrap: "wrap",
      gap: "6px",
      justifyContent: "center",
      marginBottom: "14px",
    },
    summaryCard: {
      border: "1px solid #ccc",
      borderRadius: "10px",
      padding: "8px 10px",
      minWidth: "150px",
      textAlign: "center",
      boxSizing: "border-box",
      background: "#15151d",
    },
    sprite: {
      width: "54px",
      height: "54px",
      objectFit: "contain",
      imageRendering: "pixelated",
      marginBottom: "4px",
    },
    monName: {
      fontWeight: 700,
      fontSize: "15px",
      marginBottom: "4px",
    },
    typeLine: {
      fontSize: "13px",
      opacity: 0.9,
      lineHeight: 1.35,
    },
    grid: {
      display: "grid",
      gap: "12px",
    },
    card: {
      border: "1px solid #444",
      borderRadius: "10px",
      padding: "14px",
      textAlign: "center",
      background: "#15151d",
    },
    row: {
      display: "flex",
      gap: "6px",
      justifyContent: "center",
      flexWrap: "wrap",
      marginBottom: "7px",
    },
    slotTitle: {
      opacity: 0.9,
      marginBottom: "6px",
    },
    slotSub: {
      fontSize: "12px",
      opacity: 0.72,
      marginBottom: "12px",
    },
    input: {
      background: "#2b2b2b",
      color: "#fff",
      border: "1px solid #666",
      borderRadius: "4px",
      padding: "5px 7px",
      boxSizing: "border-box",
    },
    statInput: {
      width: "74px",
      background: "#2b2b2b",
      color: "#fff",
      border: "1px solid #666",
      borderRadius: "4px",
      padding: "5px 7px",
      boxSizing: "border-box",
    },
    moveInput: {
      width: "150px",
      background: "#2b2b2b",
      color: "#fff",
      border: "1px solid #666",
      borderRadius: "4px",
      padding: "5px 7px",
      boxSizing: "border-box",
    },
  };

  return (
    <div style={styles.wrapper}>
      <h2 style={styles.title}>Team Builder</h2>

      <div style={styles.topBar}>
        <input
          value={team.teamName}
          onChange={(e) => setTeam({ ...team, teamName: e.target.value })}
          placeholder="Team Name"
          style={styles.teamName}
        />

        <button style={styles.button} onClick={loadMyTeam}>
          Load My Team
        </button>

        <button style={styles.button} onClick={clearTeam}>
          Clear Team
        </button>

        {complete && !isEditing && (
          <button style={styles.button} onClick={() => setIsEditing(true)}>
            Edit Team
          </button>
        )}

        {complete && isEditing && (
          <button style={styles.button} onClick={() => setIsEditing(false)}>
            Collapse Team
          </button>
        )}
      </div>

      {complete && !isEditing ? (
        <div style={styles.summaryGrid}>
          {team.members.map((member) => (
            <div key={member.slot} style={styles.summaryCard}>
              {getSprite(member.name) && (
                <img
                  src={getSprite(member.name)}
                  alt={member.name}
                  style={styles.sprite}
                />
              )}

              <div style={styles.monName}>{member.name}</div>

              <div style={styles.typeLine}>{getTypes(member.name)}</div>
            </div>
          ))}
        </div>
      ) : (
        <div style={styles.grid}>
          {team.members.map((member, index) => {
            const title = member.name || `Slot ${index + 1}`;

            return (
              <div key={index} style={styles.card}>
                <h3 style={styles.slotTitle}>{title}</h3>

                <div style={styles.slotSub}>
                  Ability: {member.ability || "Ability"} | Item:{" "}
                  {member.item || "Item"} | Nature: {member.nature || "Nature"}
                </div>

                <div style={styles.row}>
                  <input
                    placeholder="Pokémon"
                    value={member.name}
                    onChange={(e) =>
                      updateMember(index, "name", e.target.value)
                    }
                    style={styles.input}
                  />

                  <input
                    placeholder="Ability"
                    value={member.ability}
                    onChange={(e) =>
                      updateMember(index, "ability", e.target.value)
                    }
                    style={styles.input}
                  />

                  <input
                    placeholder="Item"
                    value={member.item}
                    onChange={(e) =>
                      updateMember(index, "item", e.target.value)
                    }
                    style={styles.input}
                  />

                  <input
                    placeholder="Nature"
                    value={member.nature}
                    onChange={(e) =>
                      updateMember(index, "nature", e.target.value)
                    }
                    style={styles.input}
                  />
                </div>

                <div style={styles.row}>
                  {Object.keys(member.stats).map((stat) => (
                    <input
                      key={stat}
                      placeholder={stat}
                      value={member.stats[stat]}
                      onChange={(e) => updateStat(index, stat, e.target.value)}
                      style={styles.statInput}
                    />
                  ))}
                </div>

                <div style={styles.row}>
                  {member.moves.map((move, moveIndex) => (
                    <input
                      key={moveIndex}
                      placeholder={`Move ${moveIndex + 1}`}
                      value={move}
                      onChange={(e) =>
                        updateMove(index, moveIndex, e.target.value)
                      }
                      style={styles.moveInput}
                    />
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}