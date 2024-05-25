export const ParticipantEffectUtils = {
  name(effect: { effect: { name: string } }) {
    return effect.effect.name;
  },
  description(effect: { effect: { description: string } }) {
    return effect.effect.description;
  },
};
