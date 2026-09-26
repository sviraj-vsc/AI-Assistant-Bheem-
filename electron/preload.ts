import { ipcRenderer } from 'electron';

(window as any).electronAPI = {
  resizeWindow: (width: number, height: number) => ipcRenderer.send('resize-window', { width, height }),
};
