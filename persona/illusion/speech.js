// speech.js — class-level defaults + full inline docs
// ------------------------------------------------------------
class NaturalTTS {
  #voices = [];
  #defaultVoice = null;

  constructor(lang = 'en-US', defaults = {}) {
    this.lang = lang;

    /* ---------------------------------------------
       Instance-level default settings
       These become the fallback for every speak() call.
       You can still override them per call via opts.
    --------------------------------------------- */
    /** @type {SpeechSynthesisVoice|null} Preferred voice. */
    this.voice       = defaults.voice  ?? null;

    /** @type {number} 0.1 – 10  (1 = normal speed) */
    this.rate        = defaults.rate   ?? 1;

    /** @type {number} 0 – 2    (1 = normal pitch) */
    this.pitch       = defaults.pitch  ?? 1;

    /** @type {number} 0 – 1    (1 = full volume) */
    this.volume      = defaults.volume ?? 1;

    /** @type {boolean} Wrap text in SSML (Edge/Win only) */
    this.ssml        = defaults.ssml   ?? false;

    /** @type {string} Emphasis level: '', 'strong', 'moderate', 'reduced' (SSML only) */
    this.emphasis    = defaults.emphasis ?? '';

    /** @type {number} Milliseconds to append after the sentence (SSML only) */
    this.breakAfter  = defaults.breakAfter ?? 0;

    this.refreshVoices();
    speechSynthesis.addEventListener('voiceschanged', () => this.refreshVoices());
  }

  refreshVoices() {
    this.#voices = speechSynthesis.getVoices();
    this.#defaultVoice =
      this.#voices.find(v => v.name === 'Google en-US-Neural2-D') ||
      this.#voices.find(v => v.name === 'Microsoft David') ||
      this.#voices.find(v => v.lang.startsWith('en') && v.localService) ||
      this.#voices[0];
  }

  list() {
    return this.#voices.map(v => ({ name: v.name, lang: v.lang }));
  }

  /**
   * Batch-update default settings.
   * @param {Object} obj - subset of {voice, rate, pitch, volume, ssml, emphasis, breakAfter}
   */
  setDefaults(obj) {
    Object.assign(this, obj);
  }

  /**
   * Speak text, merging instance defaults with per-call overrides.
   * @param {string} text - text to speak.
   * @param {Object} [opts] - per-call overrides (same keys as instance defaults).
   * @returns {SpeechSynthesisUtterance} live utterance (you can .pause(), .resume(), etc.).
   */
  speak(text, opts = {}) {
    // Merge: per-call opts > instance defaults
    const {
      voice       = this.voice ?? this.#defaultVoice,
      rate        = this.rate,
      pitch       = this.pitch,
      volume      = this.volume,
      ssml        = this.ssml,
      emphasis    = this.emphasis,
      breakAfter  = this.breakAfter,
      onEnd       = null
    } = { ...this, ...opts };

    speechSynthesis.cancel(); // auto-stop previous

    let finalText = String(text);
    const canSSML = ssml && voice?.name?.includes('Microsoft');

    if (canSSML) {
      finalText = `<speak><prosody rate="${Math.max(0.1, Math.min(10, rate)) * 100}%" ` +
                  `pitch="${Math.max(0, Math.min(2, pitch))}">` +
                  (emphasis ? `<emphasis level="${emphasis}">${text}</emphasis>` : text) +
                  (breakAfter ? `<break time="${Math.max(0, breakAfter)}ms"/>` : '') +
                  '</prosody></speak>';
    }

    const utter = new SpeechSynthesisUtterance(finalText);

    // Only assign valid SpeechSynthesisVoice objects
    if (voice && voice instanceof SpeechSynthesisVoice) utter.voice = voice;
    utter.lang   = voice?.lang || this.lang;
    utter.rate   = canSSML ? 1 : Math.max(0.1, Math.min(10, rate));
    utter.pitch  = canSSML ? 1 : Math.max(0, Math.min(2, pitch));
    utter.volume = Math.max(0, Math.min(1, volume));

    if (onEnd && typeof onEnd === 'function') utter.addEventListener('end', onEnd);
    speechSynthesis.speak(utter);
    return utter;
  }

  /** Stop/cancel any utterance immediately */
  stop()   { speechSynthesis.cancel(); }

  /** Pause the current utterance (if any) */
  pause()  { speechSynthesis.pause(); }

  /** Resume after pause */
  resume() { speechSynthesis.resume(); }
}

window.NaturalTTS = NaturalTTS;
