export class AudioPlayer {
  audioContext: AudioContext;
  nextPlayTime: number = 0;

  constructor() {
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }

  playBuffer(pcm16Buffer: ArrayBuffer) {
    if (this.audioContext.state === 'suspended') {
      this.audioContext.resume();
    }
    const int16Array = new Int16Array(pcm16Buffer);
    const float32Array = new Float32Array(int16Array.length);
    for (let i = 0; i < int16Array.length; i++) {
      float32Array[i] = int16Array[i] / 32768.0;
    }

    const audioBuffer = this.audioContext.createBuffer(1, float32Array.length, 24000);
    audioBuffer.getChannelData(0).set(float32Array);

    const source = this.audioContext.createBufferSource();
    source.buffer = audioBuffer;
    source.connect(this.audioContext.destination);

    if (this.nextPlayTime < this.audioContext.currentTime) {
      this.nextPlayTime = this.audioContext.currentTime;
    }
    source.start(this.nextPlayTime);
    this.nextPlayTime += audioBuffer.duration;
  }

  stop() {
    this.nextPlayTime = 0;
    // We could keep track of sources and stop them, or just suspend and recreate the context
    this.audioContext.close();
    this.audioContext = new AudioContext({ sampleRate: 24000 });
  }
}
