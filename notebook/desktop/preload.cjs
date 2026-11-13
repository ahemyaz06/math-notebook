// The only bridge between the page and the computer: menu commands in, chosen files out.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('notebook', {
  onCommand: (handler) => ipcRenderer.on('command', (_event, name) => handler(name)),
  choosePdf: () => ipcRenderer.invoke('choose-pdf'),
  openNotebook: () => ipcRenderer.invoke('open-notebook'),
  openText: (options) => ipcRenderer.invoke('open-text', options),
  save: (options) => ipcRenderer.invoke('save', options),
  writeDraft: (draft) => ipcRenderer.invoke('recovery-write', draft),
  clearDraft: () => ipcRenderer.invoke('recovery-clear'),
  listDrafts: () => ipcRenderer.invoke('recovery-list'),
  takeDraft: (id) => ipcRenderer.invoke('recovery-take', id),
  discardDraft: (id) => ipcRenderer.invoke('recovery-discard', id),
  saveBinary: (options) => ipcRenderer.invoke('save-binary', options),
  exportPdf: (options) => ipcRenderer.invoke('export-pdf', options),
  exportBraille: (options) => ipcRenderer.invoke('export-braille', options),
  print: () => ipcRenderer.invoke('print'),
  copyText: (text) => ipcRenderer.invoke('copy-text', text),
  readText: () => ipcRenderer.invoke('read-text'),
  setTitle: (title) => ipcRenderer.send('set-title', title),
  getMenu: () => ipcRenderer.invoke('get-menu'),
  setMenuChecked: (id, checked) => ipcRenderer.send('set-menu-checked', id, checked),
  // The user guide window: the guide or the changelog as text, and Escape to close it.
  readGuide: (name) => ipcRenderer.invoke('guide-read', name),
  closeGuide: () => ipcRenderer.send('guide-close'),
  onGuideShow: (handler) => ipcRenderer.on('guide-show', (_event, name, hash) => handler(name, hash)),
});
