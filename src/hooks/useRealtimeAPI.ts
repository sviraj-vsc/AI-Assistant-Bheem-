import { useState, useRef, useEffect, useCallback } from 'react';
import { arrayBufferToBase64, base64ToArrayBuffer } from '../utils/base64';
import { AudioPlayer } from '../utils/AudioPlayer';

export type BheemState = 'idle' | 'listening' | 'thinking' | 'speaking';
export type ToolCall = {
  call_id: string;
  name: string;
  arguments: any;
};

export function useRealtimeAPI(apiKey: string, onToolCall?: (tool: ToolCall) => Promise<any>, setArtifacts?: any, onError?: any) {
  const [status, setStatus] = useState<BheemState>('idle');
  const [activeTask, setActiveTask] = useState<string | null>(null);
  const [volume, setVolume] = useState<number>(0);
  const isToolExecutingRef = useRef<boolean>(false);
  const wsRef = useRef<WebSocket | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const workletNodeRef = useRef<AudioWorkletNode | null>(null);
  const audioPlayerRef = useRef<AudioPlayer | null>(null);
  
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaStreamRef.current = stream;
      
      const audioCtx = new AudioContext({ sampleRate: 24000 });
      audioContextRef.current = audioCtx;
      
      await audioCtx.audioWorklet.addModule('/audio-processor.js');
      
      const source = audioCtx.createMediaStreamSource(stream);
      const workletNode = new AudioWorkletNode(audioCtx, 'audio-processor');
      workletNodeRef.current = workletNode;
      
      workletNode.port.onmessage = (event) => {
        if (isToolExecutingRef.current) return;
        if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
          const pcm16 = event.data;
          const base64 = arrayBufferToBase64(pcm16);
          wsRef.current.send(JSON.stringify({
            realtimeInput: {
              audio: { mimeType: "audio/pcm;rate=24000", data: base64 }
            }
          }));
        }
      };
      
      source.connect(workletNode);
      workletNode.connect(audioCtx.destination);
      return true;
    } catch (e: any) {
      console.error("Mic error:", e);
      onError?.(`Microphone Error: ${e.message}`);
      return false;
    }
  };

  const connect = useCallback(async () => {
    if (!apiKey) return;
    setStatus('listening');
    
    audioPlayerRef.current = new AudioPlayer();
    let started = await startRecording();
    if (!started) {
      setStatus('idle');
      return;
    }

    const sanitizedKey = encodeURIComponent(apiKey.trim());
    wsRef.current = new WebSocket(`wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${sanitizedKey}`);

    wsRef.current.onerror = (e) => {
      console.error('WebSocket Error:', e);
      onError?.('WebSocket Connection Error');
      setStatus('idle');
    };

    wsRef.current.onclose = (e) => {
      console.log('WebSocket Closed:', e.code, e.reason);
      onError?.((prev: string | null) => prev ? prev : `WebSocket Closed: ${e.code} ${e.reason}`);
      setStatus('idle');
    };

    wsRef.current.onopen = () => {
      console.log('Gemini WebSocket Connected');
      wsRef.current?.send(JSON.stringify({
        setup: {
          model: "models/gemini-3.1-flash-live-preview",
          generationConfig: {
            responseModalities: ["AUDIO"]
          },
          systemInstruction: {
            parts: [{ text: "You are Bheem, a desktop AI companion. You have a minimal animated face and a side-screen panel for displaying visuals. Always speak in English. Keep responses concise and natural for voice. PROACTIVELY use your generate_image, render_mermaid, and search_web tools to display related visuals, charts, or images on your side-screen whenever you are explaining a topic or discussing something interesting!" }]
          },
          tools: [{
            functionDeclarations: [
              {
                name: "search_web",
                description: "Search the web for information using Exa API",
                parameters: { type: "object", properties: { query: { type: "string" } }, required: ["query"] }
              },
              {
                name: "generate_image",
                description: "Generate an image using DALL-E",
                parameters: { type: "object", properties: { prompt: { type: "string" } }, required: ["prompt"] }
              },
              {
                name: "render_mermaid",
                description: "Render a mermaid chart in the artifact panel",
                parameters: { type: "object", properties: { chart: { type: "string" }, description: { type: "string" } }, required: ["chart"] }
              },
              {
                name: "open_browser",
                description: "Open the user's web browser to a specific URL. Use this when the user asks to open a website, search on youtube, etc.",
                parameters: { type: "object", properties: { url: { type: "string", description: "The full URL to open (e.g. https://youtube.com/results?search_query=...)" } }, required: ["url"] }
              },
              {
                name: "open_application",
                description: "Open a local application or program on the user's computer.",
                parameters: { type: "object", properties: { appName: { type: "string", description: "The executable name of the app to open (e.g., 'calc', 'notepad', 'code', 'spotify')" } }, required: ["appName"] }
              }
            ]
          }]
        }
      }));
    };

    wsRef.current.onmessage = async (e) => {
      let msg;
      // Handle Blob
      if (e.data instanceof Blob) {
        const text = await e.data.text();
        msg = JSON.parse(text);
      } else {
        msg = JSON.parse(e.data);
      }
      
      if (msg.serverContent?.modelTurn?.parts) {
        setStatus('speaking');
        for (const part of msg.serverContent.modelTurn.parts) {
          if (part.inlineData && part.inlineData.mimeType.startsWith('audio/pcm')) {
            const buffer = base64ToArrayBuffer(part.inlineData.data);
            audioPlayerRef.current?.playBuffer(buffer);
            
            // compute volume
            const int16 = new Int16Array(buffer);
            let sum = 0;
            for(let i=0; i<Math.min(int16.length, 100); i++) {
                sum += Math.abs(int16[i]);
            }
            setVolume(sum / 100 / 32768);
          }
          if (part.functionCall && onToolCall) {
            setStatus('thinking');
            let tName = part.functionCall.name;
            if (tName === 'search_web') tName = 'Searching the web...';
            if (tName === 'generate_image') tName = 'Generating an image...';
            if (tName === 'render_mermaid') tName = 'Creating a diagram...';
            if (tName === 'open_browser') tName = 'Opening browser...';
            if (tName === 'open_application') tName = 'Opening application...';
            setActiveTask(tName);
            isToolExecutingRef.current = true;
            
            const result = await onToolCall({ 
              call_id: part.functionCall.id || part.functionCall.name, 
              name: part.functionCall.name, 
              arguments: part.functionCall.args 
            });
            
            setActiveTask(null);
            isToolExecutingRef.current = false;
            
            wsRef.current?.send(JSON.stringify({
              clientContent: {
                turnComplete: true,
                turns: [{
                  role: "user",
                  parts: [{
                    functionResponse: {
                      id: part.functionCall.id || part.functionCall.name,
                      name: part.functionCall.name,
                      response: { result }
                    }
                  }]
                }]
              }
            }));
          }
        }
      }
      if (msg.serverContent?.turnComplete) {
         setTimeout(() => setStatus('listening'), 500);
         setVolume(0);
      }
    };
  }, [apiKey, onToolCall]);

  const disconnect = () => {
    wsRef.current?.close();
    audioPlayerRef.current?.stop();
    audioContextRef.current?.close();
    mediaStreamRef.current?.getTracks().forEach(t => t.stop());
    setStatus('idle');
  };

  return { status, activeTask, volume, connect, disconnect };
}
