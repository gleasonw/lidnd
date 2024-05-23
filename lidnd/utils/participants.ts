function isPlayer(participant: { creature: { is_player: boolean } }) {
  return participant.creature.is_player;
}

function name(participant: { creature: { name: string } }) {
  return participant.creature.name;
}

export const ParticipantUtils = {
  isPlayer,
  name,
  maxHp(participant: { creature: { max_hp: number } }) {
    return participant.creature.max_hp;
  },
};
