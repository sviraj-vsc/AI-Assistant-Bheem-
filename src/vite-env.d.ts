/// <reference types="vite/client" />

interface Window {
  electronAPI: {
    resizeWindow: (width: number, height: number) => void;
  }
}
