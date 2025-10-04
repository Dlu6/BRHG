const audioContext = new (window.AudioContext || window.webkitAudioContext)();
const activeOscillators = new Set();

const frequencies = {
  1: [697, 1209],
  2: [697, 1336],
  3: [697, 1477],
  4: [770, 1209],
  5: [770, 1336],
  6: [770, 1477],
  7: [852, 1209],
  8: [852, 1336],
  9: [852, 1477],
  "*": [941, 1209],
  0: [941, 1336],
  "#": [941, 1477],
  delete: [350, 440],
};

const stopAllTones = () => {
  activeOscillators.forEach(({ osc1, osc2, gain, timeoutId }) => {
    clearTimeout(timeoutId);
    osc1.stop();
    osc2.stop();
    osc1.disconnect();
    osc2.disconnect();
    gain.disconnect();
  });
  activeOscillators.clear();
};

const playTone = (key, duration = 100) => {
  if (!frequencies[key]) return;

  // Stop any existing tones
  stopAllTones();

  const [freq1, freq2] = frequencies[key];

  const osc1 = audioContext.createOscillator();
  const osc2 = audioContext.createOscillator();
  const gainNode = audioContext.createGain();

  osc1.frequency.value = freq1;
  osc2.frequency.value = freq2;

  osc1.connect(gainNode);
  osc2.connect(gainNode);
  gainNode.connect(audioContext.destination);

  gainNode.gain.value = key === "delete" ? 0.05 : 0.1;

  osc1.start();
  osc2.start();

  const timeoutId = setTimeout(() => {
    osc1.stop();
    osc2.stop();
    osc1.disconnect();
    osc2.disconnect();
    gainNode.disconnect();
    activeOscillators.delete(oscillatorSet);
  }, duration);

  const oscillatorSet = { osc1, osc2, gain: gainNode, timeoutId };
  activeOscillators.add(oscillatorSet);
};

export const dtmfService = {
  playTone,
  stopAllTones,
};
