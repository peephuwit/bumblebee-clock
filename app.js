/**
 * ARACHNE HOROLOGY ENGINE
 * High-precision clockwork driver using GSAP monotonic transforms & drift-free scheduling
 */

// DOM Elements
const handSec = document.getElementById('sec');
const handMin = document.getElementById('min');
const handHour = document.getElementById('hour');
const readout = document.getElementById('readout');
const readoutDate = document.getElementById('readout-date');
const dialCalendarDate = document.getElementById('dial-calendar-date');
const silkThread = document.getElementById('silk-thread');

// Perpetual Calendar Constants
const DAYS_SHORT = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const DAYS_FULL = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
const MONTHS_SHORT = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const MONTHS_FULL = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];

// Set initial transforms origin explicitly to the exact center (0,0) of the SVG clock
gsap.set([handSec, handMin, handHour], {
  svgOrigin: '0 0',
  transformOrigin: '0px 0px',
  rotation: 0
});

/**
 * a leg must never swing back through twelve -
 * so keep the rotation monotonic across 360° wraps
 */
function forwardOf(el, target) {
  const now = gsap.getProperty(el, 'rotation') || 0;
  const lifted = target + 360 * Math.round((now - target) / 360);
  return lifted < now ? lifted + 360 : lifted;
}

/**
 * Format two digits with leading zero
 */
function pad(num) {
  return String(num).padStart(2, '0');
}

// ====================================================
// LUXURY HOROLOGY MECHANICAL ESCAPEMENT SOUND ENGINE
// ====================================================
let audioCtx = null;
let isSoundEnabled = true;
let currentThemeKey = 'classic-gold';
let isBlueprintMode = false;

// ====================================================
// HAUTE HORLOGERIE PALETTES & CONFIGURATOR DEFINITIONS
// ====================================================
const THEMES = {
  'classic-gold': {
    name: "Classic Honey Gold",
    brand: "BUMBLEBEE D'OR",
    subTitle: "CALIBRE ROYALE — CHRONOMÈTRE AUTOMATIQUE",
    goldLightStops: ["#ffffff", "#fff2c7", "#deb050", "#945914", "#3d1d03"],
    goldDarkStops: ["#fceda4", "#b88028", "#5c2d05", "#260f01", "#0f0400"],
    stingerStops: ["#fff5cc", "#e8b038", "#8a4f08", "#3d1d03"],
    digitStops: ["#fff8e3", "#f5d485", "#deb464", "#b88028"],
    wingMembraneLeft: ["#fffbe6", "#ffe066", "#ffa000", "#d95f02", "#592003"],
    wingMembraneRight: ["#fffbe6", "#ffe066", "#ffa000", "#d95f02", "#592003"],
    hindwingMembrane: ["#fff8db", "#ffd54f", "#ff8f00", "#7c2d03"],
    stripeGold: ["#e5a93b", "#ffe899", "#ffd54f", "#ffe899", "#b0741a"],
    stripeDark: ["#040507", "#1c1308", "#2d1e0c", "#1c1308", "#040507"],
    eyeStops: ["#ff8080", "#d61a1a", "#700505", "#1f0000"],
    auraOuter: "#fff9c4",
    auraMid: "#ffe082",
    auraCore: "#fff8db",
    auraUnder: "#ffd54f",
    tickFreq: [1950, 1520]
  },
  'obsidian-platinum': {
    name: "Obsidian Platinum",
    brand: "BUMBLEBEE PLATINE",
    subTitle: "CALIBRE PLATINE // TITANIUM ESCAPEMENT",
    goldLightStops: ["#ffffff", "#e8f0fe", "#94a3b8", "#475569", "#0f172a"],
    goldDarkStops: ["#f1f5f9", "#94a3b8", "#334155", "#0f172a", "#020617"],
    stingerStops: ["#ffffff", "#cbd5e1", "#64748b", "#0f172a"],
    digitStops: ["#ffffff", "#e2e8f0", "#94a3b8", "#64748b"],
    wingMembraneLeft: ["#f8fafc", "#bae6fd", "#38bdf8", "#0284c7", "#082f49"],
    wingMembraneRight: ["#f8fafc", "#bae6fd", "#38bdf8", "#0284c7", "#082f49"],
    hindwingMembrane: ["#f0f9ff", "#7dd3fc", "#0284c7", "#0c4a6e"],
    stripeGold: ["#94a3b8", "#f1f5f9", "#e2e8f0", "#f1f5f9", "#64748b"],
    stripeDark: ["#020617", "#0f172a", "#1e293b", "#0f172a", "#020617"],
    eyeStops: ["#7dd3fc", "#0284c7", "#0369a1", "#082f49"],
    auraOuter: "#e0f2fe",
    auraMid: "#7dd3fc",
    auraCore: "#f0f9ff",
    auraUnder: "#38bdf8",
    tickFreq: [2200, 1750]
  }
};

const soundToggleBtn = document.getElementById('sound-toggle');
const soundIcon = document.getElementById('sound-icon');
const soundLabel = document.getElementById('sound-label');

function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
}

function updateSoundUI() {
  if (!soundToggleBtn) return;
  if (isSoundEnabled) {
    soundToggleBtn.classList.remove('muted');
    if (soundIcon) soundIcon.textContent = '🔊';
    if (soundLabel) soundLabel.textContent = 'ESCAPEMENT: ON';
  } else {
    soundToggleBtn.classList.add('muted');
    if (soundIcon) soundIcon.textContent = '🔇';
    if (soundLabel) soundLabel.textContent = 'ESCAPEMENT: OFF';
  }
}

if (soundToggleBtn) {
  soundToggleBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    initAudio();
    isSoundEnabled = !isSoundEnabled;
    updateSoundUI();
    if (isSoundEnabled) {
      playMechanicalTick(true);
    }
  });
}

// Proactive Web Audio API Auto-Unlock on first gesture or pointer movement
const unlockAudioOnInteraction = () => {
  initAudio();
  if (audioCtx && audioCtx.state === 'running') {
    ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'click'].forEach(evt => {
      window.removeEventListener(evt, unlockAudioOnInteraction);
    });
  }
};

['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'click'].forEach(evt => {
  window.addEventListener(evt, unlockAudioOnInteraction, { passive: true });
});

// Try immediate initialization on load (if browser policy allows)
initAudio();

/**
 * High-fidelity Swiss Mechanical Escapement & Gear Jerk Synthesizer
 * Synthesizes a delicate, gentle, soft-to-the-ear mechanical impulse
 * Alternates between "Tick" (even seconds) and "Tock" (odd seconds)
 */
function playMechanicalTick(isEvenSecond) {
  if (!isSoundEnabled) return;
  initAudio();
  if (!audioCtx || audioCtx.state !== 'running') return;

  const t = audioCtx.currentTime;

  // Master volume for distinct, crisp luxury horological escapement
  const masterGain = audioCtx.createGain();
  masterGain.gain.setValueAtTime(0.65, t);
  masterGain.connect(audioCtx.destination);

  // 1. Ruby Pallet Jewel Escapement Contact (Delicate Jewel Ping)
  const osc = audioCtx.createOscillator();
  const oscGain = audioCtx.createGain();
  const freqs = (typeof isBlueprintMode !== 'undefined' && isBlueprintMode)
    ? [1750, 1380]
    : ((typeof THEMES !== 'undefined' && THEMES[currentThemeKey]?.tickFreq) ? [1580, 1260] : [1520, 1220]);
  const baseFreq = isEvenSecond ? freqs[0] : freqs[1];

  osc.type = 'sine';
  osc.frequency.setValueAtTime(baseFreq, t);
  osc.frequency.exponentialRampToValueAtTime(baseFreq * 0.65, t + 0.024);

  oscGain.gain.setValueAtTime(0.70, t);
  oscGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.024);

  osc.connect(oscGain);
  oscGain.connect(masterGain);

  osc.start(t);
  osc.stop(t + 0.025);

  // 2. Soft Gear Backlash & Escapement Tooth Catch (Damped Micro-Transient)
  const sampleRate = audioCtx.sampleRate;
  const burstLength = Math.floor(sampleRate * 0.014); // 14ms burst
  const noiseBuffer = audioCtx.createBuffer(1, burstLength, sampleRate);
  const output = noiseBuffer.getChannelData(0);
  for (let i = 0; i < burstLength; i++) {
    output[i] = (Math.random() * 2 - 1) * Math.exp(-i / (burstLength * 0.35));
  }

  const whiteNoise = audioCtx.createBufferSource();
  whiteNoise.buffer = noiseBuffer;

  const filter = audioCtx.createBiquadFilter();
  filter.type = 'bandpass';
  filter.frequency.setValueAtTime(isEvenSecond ? 2800 : 2100, t);
  filter.Q.setValueAtTime(3.2, t);

  const noiseGain = audioCtx.createGain();
  noiseGain.gain.setValueAtTime(0.55, t);
  noiseGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.014);

  whiteNoise.connect(filter);
  filter.connect(noiseGain);
  noiseGain.connect(masterGain);

  whiteNoise.start(t);
  whiteNoise.stop(t + 0.015);

  // 3. Watch Case Cavity Resonance (Warm Low-Frequency Mechanical Body Thud)
  const subOsc = audioCtx.createOscillator();
  const subGain = audioCtx.createGain();
  subOsc.type = 'sine';
  subOsc.frequency.setValueAtTime(isEvenSecond ? 360 : 290, t);
  subOsc.frequency.exponentialRampToValueAtTime(85, t + 0.028);

  subGain.gain.setValueAtTime(0.58, t);
  subGain.gain.exponentialRampToValueAtTime(0.0001, t + 0.028);

  subOsc.connect(subGain);
  subGain.connect(masterGain);

  subOsc.start(t);
  subOsc.stop(t + 0.029);
}

/**
 * Harmonic Golden Shimmer Chime for Bee Micro-Reaction
 */
function playBeeFlutterSound() {
  if (!isSoundEnabled) return;
  initAudio();
  if (!audioCtx || audioCtx.state !== 'running') return;

  const t = audioCtx.currentTime;
  const chordFreqs = [1046.5, 1318.5, 1567.98, 2093.0]; // C6, E6, G6, C7 Harmonic Triad
  chordFreqs.forEach((freq, i) => {
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, t + i * 0.025);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.04, t + i * 0.025 + 0.12);

    gain.gain.setValueAtTime(0.045, t + i * 0.025);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + i * 0.025 + 0.3);

    osc.connect(gain);
    gain.connect(audioCtx.destination);

    osc.start(t + i * 0.025);
    osc.stop(t + i * 0.025 + 0.31);
  });
}

/**
 * Mechanical Horological Winding Click Sound
 */
function playWindingClickSound() {
  if (!isSoundEnabled) return;
  initAudio();
  if (!audioCtx || audioCtx.state !== 'running') return;

  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.type = 'triangle';
  osc.frequency.setValueAtTime(3200, t);
  osc.frequency.exponentialRampToValueAtTime(1200, t + 0.012);

  gain.gain.setValueAtTime(0.065, t);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.012);

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.start(t);
  osc.stop(t + 0.013);
}

// ====================================================
// TIME MACHINE STATE & ASTRONOMICAL MOONPHASE ENGINE
// ====================================================
let timeOffsetMs = 0;
let isManualTimeMode = false;

/**
 * True Astronomical Lunar Phase Calculator
 * Reference epoch: 2000-01-06 18:14 UTC (Known Reference New Moon)
 * Mean Synodic Lunar Month = 29.530588853 days
 */
function getMoonPhaseAngle(date) {
  const epoch = Date.UTC(2000, 0, 6, 18, 14, 0);
  const synodicMonthMs = 29.530588853 * 86400 * 1000;
  const diff = date.getTime() - epoch;
  const phaseFraction = (((diff % synodicMonthMs) + synodicMonthMs) % synodicMonthMs) / synodicMonthMs;
  // Moon disc contains 2 moons 180° apart; full cycle = 180° disc rotation
  return phaseFraction * 180;
}

/**
 * Updates all clockwork visuals (Hands, Skeleton Gears, Moonphase, Digital Readout)
 */
function updateClockVisuals(date, isInstant = false) {
  const ms = date.getMilliseconds();
  const s = date.getSeconds();
  const m = date.getMinutes();
  const h = date.getHours();
  const h12 = h % 12;

  // Exact geometric angles
  const targetSec = s * 6;
  const targetMin = (m + s / 60) * 6;
  const targetHour = (h12 + m / 60 + s / 3600) * 30;

  // Total seconds for synchronous gear kinematics
  const totalSeconds = h * 3600 + m * 60 + s + ms / 1000;
  const gearSmallAngle = totalSeconds * 6;
  const gearMedAngle = -totalSeconds * 4;
  const gearLargeAngle = totalSeconds * 3;
  const gearGiantAngle = -totalSeconds * 2.4;

  const moonAngle = getMoonPhaseAngle(date);

  if (isInstant) {
    gsap.set(handSec, { rotation: targetSec, svgOrigin: '0 0' });
    gsap.set(handMin, { rotation: targetMin, svgOrigin: '0 0' });
    gsap.set(handHour, { rotation: targetHour, svgOrigin: '0 0' });
    gsap.set('#gear-small', { rotation: gearSmallAngle, svgOrigin: '68 -8' });
    gsap.set('#gear-medium', { rotation: gearMedAngle, svgOrigin: '36 -55' });
    gsap.set('#gear-large', { rotation: gearLargeAngle, svgOrigin: '-45 -45' });
    gsap.set('#gear-giant', { rotation: gearGiantAngle, svgOrigin: '-18 58' });
    gsap.set('#moonphase-disc', { rotation: moonAngle, svgOrigin: '0 112' });
  } else {
    const nextSec = forwardOf(handSec, targetSec);
    const nextMin = forwardOf(handMin, targetMin);
    const nextHour = forwardOf(handHour, targetHour);

    gsap.to(handSec, {
      rotation: nextSec,
      duration: 0.35,
      ease: 'elastic.out(1, 0.55)',
      overwrite: 'auto'
    });

    gsap.to(handMin, {
      rotation: nextMin,
      duration: 0.8,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    gsap.to(handHour, {
      rotation: nextHour,
      duration: 1.0,
      ease: 'power2.out',
      overwrite: 'auto'
    });

    gsap.to('#gear-small', {
      rotation: gearSmallAngle,
      svgOrigin: '68 -8',
      duration: 0.35,
      ease: 'elastic.out(1, 0.65)',
      overwrite: 'auto'
    });

    gsap.to('#gear-medium', {
      rotation: gearMedAngle,
      svgOrigin: '36 -55',
      duration: 0.35,
      ease: 'elastic.out(1, 0.65)',
      overwrite: 'auto'
    });

    gsap.to('#gear-large', {
      rotation: gearLargeAngle,
      svgOrigin: '-45 -45',
      duration: 0.35,
      ease: 'elastic.out(1, 0.65)',
      overwrite: 'auto'
    });

    gsap.to('#gear-giant', {
      rotation: gearGiantAngle,
      svgOrigin: '-18 58',
      duration: 0.35,
      ease: 'elastic.out(1, 0.65)',
      overwrite: 'auto'
    });

    gsap.to('#moonphase-disc', {
      rotation: moonAngle,
      svgOrigin: '0 112',
      duration: 0.8,
      ease: 'power2.out',
      overwrite: 'auto'
    });
  }

  // Update Digital Time Readout
  if (readout) {
    readout.textContent = `${pad(h)}:${pad(m)}:${pad(s)}`;
  }

  // Update Perpetual Calendar Displays (Dial Complication & Footer Readout)
  const dayIndex = date.getDay();
  const monthIndex = date.getMonth();
  const dateNum = pad(date.getDate());
  const yearNum = date.getFullYear();

  if (dialCalendarDate) {
    dialCalendarDate.textContent = `${DAYS_SHORT[dayIndex]} • ${dateNum} ${MONTHS_SHORT[monthIndex]} ${yearNum}`;
  }

  if (readoutDate) {
    readoutDate.textContent = `${DAYS_FULL[dayIndex]}, ${date.getDate()} ${MONTHS_FULL[monthIndex]} ${yearNum}`;
  }
}

/**
 * Main Horological Tick
 * Synchronized to system epoch milliseconds
 */
function tick() {
  const effectiveTime = isManualTimeMode ? new Date(Date.now() + timeOffsetMs) : new Date();
  playMechanicalTick(effectiveTime.getSeconds() % 2 === 0);
  updateClockVisuals(effectiveTime, false);

  scheduleTick();
}

/**
 * Drift-free Second Scheduler
 */
function scheduleTick() {
  const delayMs = 1000 - (Date.now() % 1000);
  gsap.delayedCall(delayMs / 1000, tick);
}

// Initial immediate setup
(function initializeClock() {
  const initialDate = new Date();
  updateClockVisuals(initialDate, true);

  // Lifelike Organic Queen Bee Respiration & Hovering Dynamics
  gsap.to('#spider-abdomen', {
    scaleY: 1.03,
    scaleX: 1.02,
    transformOrigin: '50% 5%',
    duration: 2.2,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  });

  // Pulsating Luminous Honey Aura Glow
  gsap.to('#bee-radiance', {
    scale: 1.07,
    opacity: 0.82,
    transformOrigin: '50% 50%',
    duration: 2.2,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true
  });

  // Set initial grand outstretched size for secondary hindwings right on page load
  gsap.set('#bee-hindwings', {
    scaleX: 1.0,
    scaleY: 1.10,
    transformOrigin: '50% 10%'
  });

  // Subtle, Gentle Secondary Hindwing Resting Motion (คงขนาดสยายปีกเท่าตอนสะบัด ไม่หดกลับ)
  function startHindwingsIdle() {
    gsap.killTweensOf('#bee-hindwings');
    gsap.to('#bee-hindwings', {
      scaleX: 1.0,
      scaleY: 1.10,
      rotation: 0.6,
      transformOrigin: '50% 10%',
      duration: 2.6,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });
  }

  // Lifelike Subtle Micro-Motion for Queen Bee's Left Front Leg (ขยับขาหน้าข้างซ้ายเล็กน้อย)
  const leftForelegTl = gsap.timeline({ repeat: -1, repeatDelay: 1.4 });
  leftForelegTl
    .to('#bee-foreleg-left', {
      rotation: -4,
      svgOrigin: '-5 -7',
      duration: 0.7,
      ease: 'sine.out'
    })
    .to('#bee-foreleg-left', {
      rotation: 1.5,
      svgOrigin: '-5 -7',
      duration: 0.45,
      ease: 'sine.inOut'
    })
    .to('#bee-foreleg-left', {
      rotation: -1,
      svgOrigin: '-5 -7',
      duration: 0.35,
      ease: 'sine.inOut'
    })
    .to('#bee-foreleg-left', {
      rotation: 0,
      svgOrigin: '-5 -7',
      duration: 0.65,
      ease: 'sine.inOut'
    });

  // Lifelike Subtle Micro-Motion for Left Hindleg (ขยับขาหลังซ้าย)
  const leftHindlegTl = gsap.timeline({ repeat: -1, repeatDelay: 1.8, delay: 0.6 });
  leftHindlegTl
    .to('#bee-hindleg-left', {
      rotation: -3,
      svgOrigin: '-5 12',
      duration: 0.8,
      ease: 'sine.out'
    })
    .to('#bee-hindleg-left', {
      rotation: 1.2,
      svgOrigin: '-5 12',
      duration: 0.5,
      ease: 'sine.inOut'
    })
    .to('#bee-hindleg-left', {
      rotation: -0.6,
      svgOrigin: '-5 12',
      duration: 0.4,
      ease: 'sine.inOut'
    })
    .to('#bee-hindleg-left', {
      rotation: 0,
      svgOrigin: '-5 12',
      duration: 0.7,
      ease: 'sine.inOut'
    });

  // Lifelike Subtle Micro-Motion for Right Hindleg (ขยับขาหลังขวา)
  const rightHindlegTl = gsap.timeline({ repeat: -1, repeatDelay: 2.1, delay: 1.1 });
  rightHindlegTl
    .to('#bee-hindleg-right', {
      rotation: 3,
      svgOrigin: '5 12',
      duration: 0.85,
      ease: 'sine.out'
    })
    .to('#bee-hindleg-right', {
      rotation: -1.2,
      svgOrigin: '5 12',
      duration: 0.5,
      ease: 'sine.inOut'
    })
    .to('#bee-hindleg-right', {
      rotation: 0.6,
      svgOrigin: '5 12',
      duration: 0.4,
      ease: 'sine.inOut'
    })
    .to('#bee-hindleg-right', {
      rotation: 0,
      svgOrigin: '5 12',
      duration: 0.7,
      ease: 'sine.inOut'
    });

  gsap.to('.dial-container', {
    y: 4,
    rotation: 0.25,
    duration: 4.0,
    ease: 'sine.inOut',
    repeat: -1,
    yoyo: true,
    transformOrigin: '50% 0%'
  });

  // ====================================================
  // HAUTE HORLOGERIE CONFIGURATOR & BLUEPRINT CONTROLLER
  // ====================================================
  const windowFrameEl = document.querySelector('.window-frame');
  const brandTitleEl = document.querySelector('.brand-title');
  const brandSubEl = document.querySelector('.brand-sub');
  const brandHeaderEl = document.querySelector('.window-header .brand');
  const themePills = document.querySelectorAll('.theme-pill');
  const blueprintToggleBtn = document.getElementById('blueprint-toggle');
  const blueprintLayer = document.getElementById('blueprint-layer');

  function morphGradient(id, stopColors, duration = 0.5) {
    const el = document.getElementById(id);
    if (!el) return;
    const stops = el.querySelectorAll('stop');
    stops.forEach((stop, i) => {
      if (stopColors[i]) {
        gsap.to(stop, {
          attr: { 'stop-color': stopColors[i] },
          duration: duration,
          ease: 'power2.out'
        });
      }
    });
  }

  function morphAuraStop(id, stopIndex, color, duration = 0.5) {
    const el = document.getElementById(id);
    if (!el) return;
    const stops = el.querySelectorAll('stop');
    if (stops[stopIndex]) {
      gsap.to(stops[stopIndex], {
        attr: { 'stop-color': color },
        duration: duration,
        ease: 'power2.out'
      });
    }
  }

  function applyTheme(themeKey) {
    const theme = THEMES[themeKey];
    if (!theme) return;
    currentThemeKey = themeKey;

    // Update Frame Class
    if (windowFrameEl) {
      windowFrameEl.classList.remove('theme-obsidian-platinum');
      if (themeKey === 'obsidian-platinum') {
        windowFrameEl.classList.add('theme-obsidian-platinum');
      }
    }

    // Update Branding Texts
    if (brandHeaderEl) brandHeaderEl.textContent = theme.brand;
    if (brandTitleEl) {
      if (themeKey === 'obsidian-platinum') brandTitleEl.textContent = 'P L A T I N E';
      else brandTitleEl.textContent = 'B U M B L E B E E';
    }
    if (brandSubEl) brandSubEl.textContent = theme.subTitle;

    // Morphs SVG Gradients
    morphGradient('gold-light', theme.goldLightStops);
    morphGradient('gold-dark', theme.goldDarkStops);
    morphGradient('stinger-gold', theme.stingerStops);
    morphGradient('digit-gold', theme.digitStops);
    morphGradient('wing-membrane-left', theme.wingMembraneLeft);
    morphGradient('wing-membrane-right', theme.wingMembraneRight);
    morphGradient('hindwing-membrane', theme.hindwingMembrane);
    morphGradient('stripe-gold', theme.stripeGold);
    morphGradient('stripe-dark', theme.stripeDark);
    morphGradient('bee-eye', theme.eyeStops);

    // Morphs Celestial Auras
    morphAuraStop('bee-aura-outer-corona', 0, theme.auraOuter);
    morphAuraStop('bee-aura-ambient', 0, theme.auraMid);
    morphAuraStop('bee-aura-core', 0, theme.auraCore);
    morphAuraStop('bee-aura', 0, theme.auraUnder);

    // Update Active Pill
    themePills.forEach(pill => {
      if (pill.dataset.theme === themeKey) {
        pill.classList.add('active');
      } else {
        pill.classList.remove('active');
      }
    });
  }

  // Theme Pill Click Listeners
  themePills.forEach(pill => {
    pill.addEventListener('click', () => {
      const themeKey = pill.dataset.theme;
      applyTheme(themeKey);
    });
  });

  // Blueprint / CAD X-Ray Toggle Listener
  if (blueprintToggleBtn) {
    blueprintToggleBtn.addEventListener('click', () => {
      isBlueprintMode = !isBlueprintMode;
      if (isBlueprintMode) {
        if (windowFrameEl) windowFrameEl.classList.add('mode-blueprint');
        blueprintToggleBtn.classList.add('active');
        const textSpan = blueprintToggleBtn.querySelector('.blueprint-text');
        if (textSpan) textSpan.textContent = 'X-RAY ACTIVE';
        if (blueprintLayer) {
          gsap.to(blueprintLayer, { opacity: 1, duration: 0.45, ease: 'power2.out' });
        }
      } else {
        if (windowFrameEl) windowFrameEl.classList.remove('mode-blueprint');
        blueprintToggleBtn.classList.remove('active');
        const textSpan = blueprintToggleBtn.querySelector('.blueprint-text');
        if (textSpan) textSpan.textContent = 'BLUEPRINT MODE';
        if (blueprintLayer) {
          gsap.to(blueprintLayer, { opacity: 0, duration: 0.35, ease: 'power2.in' });
        }
        applyTheme(currentThemeKey);
      }
    });
  }

  // ====================================================
  // BEE INTERACTIVE MICRO-REACTIONS ENGINE
  // ====================================================
  const beeHitbox = document.getElementById('bee-hitbox');
  const beeHindwings = document.getElementById('bee-hindwings');
  const beeAntennaLeft = document.getElementById('bee-antenna-left');
  const beeAntennaRight = document.getElementById('bee-antenna-right');
  const beeShockwave1 = document.getElementById('bee-shockwave-1');
  const beeShockwave2 = document.getElementById('bee-shockwave-2');
  const beeRadiance = document.getElementById('bee-radiance');
  const spiderAbdomen = document.getElementById('spider-abdomen');

  let lastHoverReactionTime = 0;

  function triggerBeeReaction(isClick = false) {
    const now = Date.now();
    if (!isClick && now - lastHoverReactionTime < 1000) return;
    lastHoverReactionTime = now;

    // 1. High-Frequency Secondary Hindwing Flutter (สยายปีกคู่เล็กสั่นพริ้วชั่วขณะแล้วกลับสู่การขยับขึ้นลงต่อเนื่อง)
    if (beeHindwings) {
      gsap.killTweensOf(beeHindwings);
      gsap.timeline({
        onComplete: () => {
          startHindwingsIdle();
        }
      })
        .to(beeHindwings, {
          scaleY: isClick ? 1.16 : 1.10,
          scaleX: 0.95,
          rotation: isClick ? -4.0 : -2.5,
          transformOrigin: '50% 10%',
          duration: 0.035,
          repeat: isClick ? 10 : 6,
          yoyo: true,
          ease: 'sine.inOut'
        })
        .to(beeHindwings, {
          scaleY: 1.10,
          scaleX: 1.0,
          rotation: 0,
          duration: 0.35,
          ease: 'power2.out'
        });
    }

    // 2. Expanding Golden Aura Ripple Wave (เปล่งแสงออร่าทองระลอกคลื่น)
    if (beeRadiance) {
      gsap.to(beeRadiance, {
        scale: isClick ? 1.28 : 1.16,
        opacity: 0.98,
        duration: 0.25,
        yoyo: true,
        repeat: 1,
        ease: 'power2.out'
      });
    }

    if (beeShockwave1) {
      gsap.killTweensOf(beeShockwave1);
      gsap.set(beeShockwave1, { attr: { r: 22, 'stroke-width': 2.5 }, opacity: isClick ? 0.95 : 0.8 });
      gsap.to(beeShockwave1, {
        attr: { r: isClick ? 170 : 130, 'stroke-width': 0.3 },
        opacity: 0,
        duration: isClick ? 0.9 : 0.75,
        ease: 'power1.out'
      });
    }

    if (beeShockwave2 && isClick) {
      gsap.killTweensOf(beeShockwave2);
      gsap.set(beeShockwave2, { attr: { r: 22, 'stroke-width': 1.8 }, opacity: 0.75 });
      gsap.to(beeShockwave2, {
        attr: { r: 200, 'stroke-width': 0.2 },
        opacity: 0,
        duration: 1.05,
        delay: 0.12,
        ease: 'power1.out'
      });
    }

    // 3. Abdomen Breath Flex
    if (spiderAbdomen) {
      gsap.to(spiderAbdomen, {
        scaleY: isClick ? 1.08 : 1.04,
        duration: 0.18,
        yoyo: true,
        repeat: 1,
        ease: 'back.out(2)'
      });
    }

    // 4. Sound on Click
    if (isClick) {
      playBeeFlutterSound();
    }
  }

  // Pointer Proximity & Direct Hover / Touch Listeners
  if (beeHitbox) {
    beeHitbox.addEventListener('pointerenter', () => {
      triggerBeeReaction(false);
    });

    beeHitbox.addEventListener('pointerdown', (e) => {
      e.stopPropagation();
      initAudio();
      triggerBeeReaction(true);
    });

    beeHitbox.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerBeeReaction(true);
    });
  }

  // Proximity & Touch Tracking over Dial Container
  const dialStage = document.querySelector('.dial-container');
  if (dialStage) {
    dialStage.addEventListener('pointermove', (e) => {
      const rect = dialStage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

      if (dist < 88) {
        triggerBeeReaction(false);
      }
    });

    dialStage.addEventListener('pointerdown', (e) => {
      const rect = dialStage.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.hypot(e.clientX - cx, e.clientY - cy);

      if (dist < 88) {
        initAudio();
        triggerBeeReaction(true);
      }
    });
  }

  // ====================================================
  // INTERACTIVE TIME MACHINE (LIVE SYNC & WINDING CROWN)
  // ====================================================
  const livesyncBtn = document.getElementById('livesync-btn');
  const watchCrown = document.getElementById('watch-crown');

  // Live Sync Button (Resets smoothly to Real-Time Clock)
  if (livesyncBtn) {
    livesyncBtn.addEventListener('click', () => {
      // Animate smoothly back to real time
      const startOffset = timeOffsetMs;
      const dummy = { offset: startOffset };
      gsap.to(dummy, {
        offset: 0,
        duration: 0.65,
        ease: 'power2.out',
        onUpdate: () => {
          timeOffsetMs = dummy.offset;
          updateClockVisuals(new Date(Date.now() + timeOffsetMs), true);
        },
        onComplete: () => {
          timeOffsetMs = 0;
          isManualTimeMode = false;
          livesyncBtn.classList.add('live-active');
          updateClockVisuals(new Date(), false);
        }
      });
    });
  }

  // 3. Interactive Winding Crown (เม็ดมะยม Drag / Inertia Physics)
  if (watchCrown) {
    let isDraggingCrown = false;
    let lastY = 0;
    let lastClickY = 0;

    watchCrown.addEventListener('pointerdown', (e) => {
      initAudio();
      isDraggingCrown = true;
      lastY = e.clientY;
      lastClickY = e.clientY;
      watchCrown.setPointerCapture(e.pointerId);
      watchCrown.classList.add('active-winding');
      if (livesyncBtn) livesyncBtn.classList.remove('live-active');
      isManualTimeMode = true;
    });

    watchCrown.addEventListener('pointermove', (e) => {
      if (!isDraggingCrown) return;
      const deltaY = lastY - e.clientY; // Up = forward, Down = rewind
      lastY = e.clientY;

      // 1px = 90 seconds (1.5 minutes)
      timeOffsetMs += deltaY * 90 * 1000;
      updateClockVisuals(new Date(Date.now() + timeOffsetMs), true);

      // Ratchet sound tick every 7px
      if (Math.abs(e.clientY - lastClickY) >= 7) {
        playWindingClickSound();
        lastClickY = e.clientY;
      }
    });

    const stopCrownDrag = (e) => {
      if (isDraggingCrown) {
        isDraggingCrown = false;
        watchCrown.classList.remove('active-winding');
        try { watchCrown.releasePointerCapture(e.pointerId); } catch (err) {}
      }
    };

    watchCrown.addEventListener('pointerup', stopCrownDrag);
    watchCrown.addEventListener('pointercancel', stopCrownDrag);
  }

  // ====================================================
  // KEYBOARD SHORTCUTS ENGINE
  // ====================================================
  window.addEventListener('keydown', (e) => {
    if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;

    // 1. Live Sync: 'L' key
    if (e.key === 'l' || e.key === 'L') {
      e.preventDefault();
      if (livesyncBtn) livesyncBtn.click();
    }
    // 2. Mute/Unmute Escapement Sound: 'M' key
    else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      if (soundToggleBtn) soundToggleBtn.click();
    }
    // 3. CAD X-Ray Blueprint: 'X' key
    else if (e.key === 'x' || e.key === 'X') {
      e.preventDefault();
      if (blueprintToggleBtn) blueprintToggleBtn.click();
    }
  });

  scheduleTick();
})();
