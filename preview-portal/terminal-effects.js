export function createTerminalFeedback({ audioFactory = () => new AudioContext() } = {}) {
  let enabled = false;
  let context;

  function setEnabled(next) {
    enabled = Boolean(next);
    return enabled;
  }

  function isEnabled() {
    return enabled;
  }

  async function playSuccess() {
    if (!enabled) return false;
    try {
      context ??= audioFactory();
      if (context.state === 'suspended') await context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(880, context.currentTime);
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.11);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start(context.currentTime);
      oscillator.stop(context.currentTime + 0.12);
      return true;
    } catch {
      return false;
    }
  }

  return Object.freeze({ setEnabled, isEnabled, playSuccess });
}

export function createRfidCardElement() {
  const card = document.createElement('div');
  card.className = 'rfid-card';
  card.setAttribute('aria-hidden', 'true');
  card.innerHTML = '<span>BSS</span><small>RFID</small>';
  return card;
}
