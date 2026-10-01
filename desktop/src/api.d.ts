import type { AppData, Asset, Campaign, Creature, EncounterPlan, EncounterRun, GameSession } from './domain';

declare global {
  interface Window {
    lidnd: {
      load(): Promise<AppData>;
      saveCampaign(value: Campaign): Promise<void>;
      saveCreature(value: Creature): Promise<void>;
      setPartyMember(campaignId: string, creatureId: string, present: boolean): Promise<void>;
      savePlan(value: EncounterPlan): Promise<void>;
      deletePlan(id: string): Promise<void>;
      saveSession(value: GameSession): Promise<void>;
      saveRun(value: EncounterRun): Promise<void>;
      importAsset(name: string, mimeType: string, base64: string): Promise<Asset>;
      readAsset(id: string): Promise<string>;
    };
  }
}
export {};
