'use strict'

const { contextBridge, ipcRenderer } = require('electron')

contextBridge.exposeInMainWorld('electronAPI', {
  // Tokens
  getTokens:   ()         => ipcRenderer.invoke('tokens:get'),
  clearToken:  (platform) => ipcRenderer.invoke('tokens:clear', platform),

  // Instagram
  instagramAuth:  ()         => ipcRenderer.invoke('instagram:auth'),
  instagramFetch: (endpoint) => ipcRenderer.invoke('instagram:fetch', endpoint),

  // TikTok
  tiktokAuth:  ()         => ipcRenderer.invoke('tiktok:auth'),
  tiktokFetch: (endpoint) => ipcRenderer.invoke('tiktok:fetch', endpoint),

  // Claude AI
  claudeAI: ({ prompt, systemPrompt }) =>
    ipcRenderer.invoke('claude:ai', { prompt, systemPrompt }),
})
