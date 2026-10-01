const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('lidnd', {
  load: () => ipcRenderer.invoke('data:load'),
  saveCampaign: value => ipcRenderer.invoke('campaign:save', value),
  saveCreature: value => ipcRenderer.invoke('creature:save', value),
  setPartyMember: (campaignId, creatureId, present) => ipcRenderer.invoke('party:set', campaignId, creatureId, present),
  savePlan: value => ipcRenderer.invoke('plan:save', value),
  deletePlan: id => ipcRenderer.invoke('plan:delete', id),
  saveSession: value => ipcRenderer.invoke('session:save', value),
  saveRun: value => ipcRenderer.invoke('run:save', value),
  importAsset: (name, mimeType, base64) => ipcRenderer.invoke('asset:import', name, mimeType, base64),
  readAsset: id => ipcRenderer.invoke('asset:read', id),
});
