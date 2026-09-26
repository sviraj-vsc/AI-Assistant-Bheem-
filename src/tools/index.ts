import Exa from 'exa-js';

export const handleToolCall = async (
  tool: { name: string; arguments: any },
  keys: { exa: string; openai: string },
  addArtifact: (artifact: any) => void
) => {
  console.log('Tool called:', tool.name, tool.arguments);
  
  if (tool.name === 'search_web') {
    if (!keys.exa) return { error: 'No Exa API key provided' };
    const exa = new Exa(keys.exa);
    try {
      const result = await exa.search(tool.arguments.query, {
        numResults: 3,
        contents: { highlights: true }
      });
      addArtifact({ type: 'search', data: result.results });
      return result.results.map(r => ({ title: r.title, url: r.url, highlights: r.highlights }));
    } catch (e: any) {
      return { error: e.message };
    }
  }

  if (tool.name === 'generate_image') {
    if (!keys.openai) return { error: 'No OpenAI API key provided' };
    try {
      const res = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${keys.openai}`
        },
        body: JSON.stringify({
          prompt: tool.arguments.prompt,
          model: 'dall-e-3',
          n: 1,
          size: '1024x1024'
        })
      });
      const data = await res.json();
      if (data.data && data.data[0]) {
        addArtifact({ type: 'image', url: data.data[0].url, prompt: tool.arguments.prompt });
        return { success: true, url: data.data[0].url };
      }
      return { error: 'Failed to generate image' };
    } catch (e: any) {
      return { error: e.message };
    }
  }

  if (tool.name === 'render_mermaid') {
    addArtifact({ type: 'mermaid', chart: tool.arguments.chart, description: tool.arguments.description });
    return { success: true };
  }

  if (tool.name === 'open_browser') {
    try {
      const electron = (window as any).require('electron');
      electron.shell.openExternal(tool.arguments.url);
      return { success: true, message: `Opened browser to ${tool.arguments.url}` };
    } catch (e: any) {
      return { error: 'Failed to open browser: ' + e.message };
    }
  }

  if (tool.name === 'open_application') {
    try {
      const cp = (window as any).require('child_process');
      // On Windows, 'start' command can launch most apps by their executable name
      cp.exec(`start "" "${tool.arguments.appName}"`);
      return { success: true, message: `Attempted to open application ${tool.arguments.appName}` };
    } catch (e: any) {
      return { error: 'Failed to open application: ' + e.message };
    }
  }

  return { error: 'Unknown tool' };
};
