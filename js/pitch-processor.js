'use strict';
/**
 * AudioWorklet processor — YIN pitch detection algorithm.
 * Runs on the audio rendering thread for low-latency pitch tracking.
 * Posts detected frequency (Hz) to the main thread; posts -1 when silent
 * or no clear fundamental is found.
 *
 * Reference: de Cheveigné & Kawahara, "YIN, a fundamental frequency
 * estimator for speech and music" (JASA 2002).
 */
class PitchProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this._bufSize   = 2048;  // analysis window (~46ms @ 44100 Hz)
    this._hopSize   = 512;   // update every ~11ms (75% overlap for smooth tracking)
    this._threshold = 0.10;  // YIN confidence threshold (lower = stricter)
    this._ring      = new Float32Array(this._bufSize);
    this._writePos  = 0;
    this._since     = 0;     // samples accumulated since last analysis
  }

  // ── YIN difference function + CMNDF + threshold + parabolic interpolation ──
  yin(buf) {
    const W = Math.floor(buf.length / 2);
    const d = new Float32Array(W);
    let runningSum = 0;
    d[0] = 1;

    for (let tau = 1; tau < W; tau++) {
      let sum = 0;
      for (let j = 0; j < W; j++) {
        const diff = buf[j] - buf[j + tau];
        sum += diff * diff;
      }
      runningSum += sum;
      // Cumulative Mean Normalized Difference Function
      d[tau] = runningSum > 0 ? (sum * tau) / runningSum : 0;
    }

    // Step 3: absolute threshold — find first dip below threshold
    let tau = 2;
    while (tau < W) {
      if (d[tau] < this._threshold) {
        // Walk to the true local minimum of this dip
        while (tau + 1 < W && d[tau + 1] < d[tau]) tau++;
        break;
      }
      tau++;
    }

    if (tau >= W || d[tau] >= this._threshold) return -1;

    // Step 5: parabolic interpolation for sub-sample accuracy
    if (tau > 0 && tau < W - 1) {
      const s0 = d[tau - 1], s1 = d[tau], s2 = d[tau + 1];
      const den = 2 * (2 * s1 - s0 - s2);
      if (Math.abs(den) > 1e-6) tau += (s2 - s0) / den;
    }

    return sampleRate / tau;
  }

  process(inputs) {
    const ch = inputs[0]?.[0];
    if (!ch) return true;

    // Fill ring buffer
    for (let i = 0; i < ch.length; i++) {
      this._ring[this._writePos % this._bufSize] = ch[i];
      this._writePos++;
      this._since++;
    }

    if (this._since >= this._hopSize) {
      this._since = 0;

      // Build contiguous analysis buffer from the ring
      const buf = new Float32Array(this._bufSize);
      const start = this._writePos - this._bufSize;
      for (let i = 0; i < this._bufSize; i++) {
        buf[i] = this._ring[(start + i + this._bufSize * 2) % this._bufSize];
      }

      // RMS silence gate — skip analysis if signal is below noise floor
      let rms = 0;
      for (let i = 0; i < buf.length; i++) rms += buf[i] * buf[i];
      rms = Math.sqrt(rms / buf.length);

      this.port.postMessage(rms > 0.008 ? this.yin(buf) : -1);
    }

    return true; // keep processor alive
  }
}

registerProcessor('pitch-processor', PitchProcessor);
