/**
 * Celestial Glockenspiel - Application Logic
 * Audio Engine, Interactive Keyboard, Canvas Particles, and Recording.
 */

// --- CONFIGURATION & CONSTANTS ---
const KEY_MAP = {
    // Naturals
    'a': 'C5', 's': 'D5', 'd': 'E5', 'f': 'F5', 'g': 'G5', 'h': 'A5', 'j': 'B5',
    'k': 'C6', 'l': 'D6', ';': 'E6', "'": 'F6', ']': 'G6',
    // Accidentals
    'w': 'C#5', 'e': 'D#5', 't': 'F#5', 'y': 'G#5', 'u': 'A#5',
    'o': 'C#6', 'p': 'D#6', '[': 'F#6'
};

// --- STATE MANAGEMENT ---
let audioCtx = null;
let masterGain = null;
let delayNode = null;
let delayFeedback = null;
let delayMix = null;
let reverbConvolver = null;
let reverbMix = null;
let analyser = null;

let currentMallet = 'wood';
let isLabelsVisible = true;

// Custom mallet tracking
let customMallet = null;
let malletHead = null;
let isTouchDevice = false;

// Multiplayer (WebRTC PeerJS) State
let peer = null;
let connections = [];
let roomId = '';
let isHost = false;
let guestMallets = {};
let guestColorIndex = 0;
let guestColors = {};
let allGuests = []; // List of all connected guest IDs (synced from host)
let localPeerId = ''; // Store local peer ID
let multiplayerMode = 'private'; // 'grand', 'quick', 'private'
let currentQuickMatchIndex = 1;
let isSearchingQuickMatch = false;
let isQuickMatchRoomFull = false;

// Recording state
let isRecording = false;
let recordStartTime = 0;
let recordedNotes = [];
let isPlayingRecording = false;
let playbackTimeouts = [];


// Metronome State
let isPlayingMetronome = false;
let bpm = 120;
let beatsPerBar = 4;
let currentBeat = 0;
let nextNoteTime = 0.0;
let scheduleAheadTime = 0.1;
let lookahead = 25.0;
let metronomeTimer = null;

// Canvas contexts
let effectsCanvas, effectsCtx;
let visualizerCanvas, visualizerCtx;

let particles = [];
let activeKeyGlows = {}; // map of noteName -> intensity

const NOTES_CONFIG = [
    // Octave 5
    { note: 'C5', freq: 523.25, type: 'natural', trigger: 'A' },
    { note: 'C#5', freq: 554.37, type: 'accidental', trigger: 'W' },
    { note: 'D5', freq: 587.33, type: 'natural', trigger: 'S' },
    { note: 'D#5', freq: 622.25, type: 'accidental', trigger: 'E' },
    { note: 'E5', freq: 659.25, type: 'natural', trigger: 'D' },
    { note: 'F5', freq: 698.46, type: 'natural', trigger: 'F' },
    { note: 'F#5', freq: 739.99, type: 'accidental', trigger: 'T' },
    { note: 'G5', freq: 783.99, type: 'natural', trigger: 'G' },
    { note: 'G#5', freq: 830.61, type: 'accidental', trigger: 'Y' },
    { note: 'A5', freq: 880.00, type: 'natural', trigger: 'H' },
    { note: 'A#5', freq: 932.33, type: 'accidental', trigger: 'U' },
    { note: 'B5', freq: 987.77, type: 'natural', trigger: 'J' },

    // Octave 6
    { note: 'C6', freq: 1046.50, type: 'natural', trigger: 'K' },
    { note: 'C#6', freq: 1109.73, type: 'accidental', trigger: 'O' },
    { note: 'D6', freq: 1174.66, type: 'natural', trigger: 'L' },
    { note: 'D#6', freq: 1244.51, type: 'accidental', trigger: 'P' },
    { note: 'E6', freq: 1318.51, type: 'natural', trigger: ';' },
    { note: 'F6', freq: 1396.91, type: 'natural', trigger: '\'' },
    { note: 'F#6', freq: 1479.98, type: 'accidental', trigger: '[' },
    { note: 'G6', freq: 1567.98, type: 'natural', trigger: ']' },
    { note: 'G#6', freq: 1661.22, type: 'accidental', trigger: '' },
    { note: 'A6', freq: 1760.00, type: 'natural', trigger: '' },
    { note: 'A#6', freq: 1864.66, type: 'accidental', trigger: '' },
    { note: 'B6', freq: 1975.53, type: 'natural', trigger: '' },

    // Octave 7
    { note: 'C7', freq: 2093.00, type: 'natural', trigger: '' },
    { note: 'C#7', freq: 2217.46, type: 'accidental', trigger: '' },
    { note: 'D7', freq: 2349.32, type: 'natural', trigger: '' },
    { note: 'D#7', freq: 2489.02, type: 'accidental', trigger: '' },
    { note: 'E7', freq: 2637.02, type: 'natural', trigger: '' },
    { note: 'F7', freq: 2793.83, type: 'natural', trigger: '' },
    { note: 'F#7', freq: 2959.96, type: 'accidental', trigger: '' },
    { note: 'G7', freq: 3135.96, type: 'natural', trigger: '' },
    { note: 'G#7', freq: 3322.44, type: 'accidental', trigger: '' },
    { note: 'A7', freq: 3520.00, type: 'natural', trigger: '' },
    { note: 'A#7', freq: 3729.31, type: 'accidental', trigger: '' },
    { note: 'B7', freq: 3951.07, type: 'natural', trigger: '' },

    // Octave 8
    { note: 'C8', freq: 4186.01, type: 'natural', trigger: '' }
];

// --- INITIALIZATION ---
window.addEventListener('DOMContentLoaded', () => {
    // Select mallet elements
    customMallet = document.getElementById('customMallet');
    if (customMallet) {
        malletHead = customMallet.querySelector('.mallet-head');
        updateMalletHeadStyle();
    }
    initStars();
    initCanvases();
    renderKeyboard();
    setupEventListeners();
    animate();

    // Initialize multiplayer based on URL hash
    const hash = window.location.hash;
    if (hash && hash.startsWith('#TEKKIN-')) {
        roomId = hash.substring(1); // remove '#'
        isHost = false;
        
        if (roomId === 'TEKKIN-GRAND-ARENA-JAMYLAS') {
            multiplayerMode = 'grand';
        } else if (roomId.startsWith('TEKKIN-BAND-JAMYLAS-') && !roomId.startsWith('TEKKIN-BAND-TEMP-')) {
            multiplayerMode = 'quick';
            const match = roomId.match(/TEKKIN-BAND-JAMYLAS-(\d+)/);
            if (match) {
                currentQuickMatchIndex = parseInt(match[1]);
            }
        } else {
            multiplayerMode = 'private';
        }
        
        updateModeIndicator();
        initMultiplayer(roomId);
    } else {
        // We are the host! Create a room
        multiplayerMode = 'private';
        const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
        roomId = `TEKKIN-${randId}`;
        isHost = true;
        window.location.hash = roomId; // Set hash
        updateModeIndicator();
        initMultiplayer(roomId);
    }
});

function updateMalletHeadStyle() {
    if (malletHead) {
        malletHead.className = `mallet-head ${currentMallet}`;
    }
}

// Canvas Setup
function initCanvases() {
    effectsCanvas = document.getElementById('effectsCanvas');
    effectsCtx = effectsCanvas.getContext('2d');
    visualizerCanvas = document.getElementById('visualizerCanvas');
    visualizerCtx = visualizerCanvas.getContext('2d');

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
}

function resizeCanvases() {
    // Resize Effects Canvas
    const frameRect = document.querySelector('.glockenspiel-frame').getBoundingClientRect();
    effectsCanvas.width = frameRect.width;
    effectsCanvas.height = frameRect.height;
    
    // Resize Visualizer
    const visContainer = document.querySelector('.visualizer-container');
    visualizerCanvas.width = visContainer.clientWidth;
    visualizerCanvas.height = visContainer.clientHeight;
}

// Background Twinkling Stars
function initStars() {
    const bg = document.getElementById('starsBackground');
    if (!bg) return;
    
    // Generate scrolling digital particles and notes
    const items = ['♪', '♫', '♬', '♩', '✦', '•', '▫'];
    const itemCount = 50;
    
    for (let i = 0; i < itemCount; i++) {
        const el = document.createElement('div');
        const isNote = Math.random() > 0.4;
        
        if (isNote) {
            el.className = 'cyber-note';
            el.textContent = items[Math.floor(Math.random() * 4)];
            el.style.fontSize = `${Math.random() * 12 + 10}px`;
        } else {
            el.className = 'cyber-spark';
            el.textContent = items[Math.floor(Math.random() * 3) + 4];
            el.style.fontSize = `${Math.random() * 6 + 4}px`;
        }
        
        el.style.left = `${Math.random() * 100}%`;
        el.style.top = `${Math.random() * 100}%`;
        
        el.style.setProperty('--duration', `${Math.random() * 15 + 15}s`);
        el.style.setProperty('--opacity', Math.random() * 0.4 + 0.15);
        el.style.setProperty('--color', Math.random() > 0.5 ? '#ff6a00' : '#00f0ff');
        
        bg.appendChild(el);
    }
}

// --- AUDIO SETUP ---
function initAudio() {
    if (audioCtx) return;

    // Create Context safely
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    audioCtx = new AudioContextClass();

    // 1. Analyser Node (for visualization)
    analyser = audioCtx.createAnalyser();
    analyser.fftSize = 256;

    // 2. Delay Network
    delayNode = audioCtx.createDelay(2.0);
    delayFeedback = audioCtx.createGain();
    delayMix = audioCtx.createGain();
    
    // Set initial values
    delayNode.delayTime.value = parseFloat(document.getElementById('delayTimeSlider').value) / 100;
    delayFeedback.gain.value = parseFloat(document.getElementById('delayFeedbackSlider').value) / 100;
    delayMix.gain.value = parseFloat(document.getElementById('delayTimeSlider').value) > 0 ? 0.2 : 0;

    // Delay loop
    delayNode.connect(delayFeedback);
    delayFeedback.connect(delayNode);

    // 3. Reverb Network (Synthetic Impulse Response)
    reverbConvolver = audioCtx.createConvolver();
    reverbConvolver.buffer = createReverbBuffer(3.0, 2.5); // 3s decay, 2.5s time constant
    reverbMix = audioCtx.createGain();
    
    const reverbVal = parseFloat(document.getElementById('reverbSlider').value) / 100;
    reverbMix.gain.value = reverbVal * 0.45; // Max Reverb Gain

    // 4. Master Volume Gain
    masterGain = audioCtx.createGain();
    const volumeVal = parseFloat(document.getElementById('volumeSlider').value) / 100;
    masterGain.gain.value = volumeVal;

    // Connections:
    // Source -> Analyser
    // Analyser -> Dry -> MasterGain
    // Analyser -> DelayNode -> delayMix -> MasterGain
    // Analyser -> ReverbConvolver -> reverbMix -> MasterGain
    // MasterGain -> Destination

    // Setup direct Dry connection
    analyser.connect(masterGain);

    // Setup Delay connection
    analyser.connect(delayNode);
    delayMix.gain.value = 0.25; // Constant delay send mix
    delayNode.connect(delayMix);
    delayMix.connect(masterGain);

    // Setup Reverb connection
    analyser.connect(reverbConvolver);
    reverbConvolver.connect(reverbMix);
    reverbMix.connect(masterGain);

    masterGain.connect(audioCtx.destination);

    updateEffects();
}

// Generate Synthetic Impulse Response for Reverb Convolver
function createReverbBuffer(duration, decay) {
    const sampleRate = audioCtx ? audioCtx.sampleRate : 44100;
    const length = sampleRate * duration;
    const impulse = (audioCtx || new (window.AudioContext || window.webkitAudioContext)()).createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const percent = i / length;
        const decayFactor = Math.exp(-percent * decay);
        // Stereo decorrelation using different noise seeds
        left[i] = (Math.random() * 2 - 1) * decayFactor;
        right[i] = (Math.random() * 2 - 1) * decayFactor;
    }
    return impulse;
}

// Update effects parameter based on UI controls
function updateEffects() {
    if (!audioCtx) return;

    // Reverb
    const reverbSlider = document.getElementById('reverbSlider');
    const reverbVal = parseFloat(reverbSlider.value) / 100;
    reverbMix.gain.setTargetAtTime(reverbVal * 0.45, audioCtx.currentTime, 0.05);
    document.getElementById('reverbValue').textContent = `${reverbSlider.value}%`;

    // Delay time
    const delayTimeSlider = document.getElementById('delayTimeSlider');
    const delayTimeVal = parseFloat(delayTimeSlider.value) / 100; // max 1.0s
    delayNode.delayTime.setTargetAtTime(delayTimeVal, audioCtx.currentTime, 0.1);
    document.getElementById('delayTimeValue').textContent = `${delayTimeVal.toFixed(1)}s`;

    // Delay Feedback
    const delayFeedbackSlider = document.getElementById('delayFeedbackSlider');
    const delayFeedbackVal = parseFloat(delayFeedbackSlider.value) / 100;
    delayFeedback.gain.setTargetAtTime(delayFeedbackVal, audioCtx.currentTime, 0.05);
    document.getElementById('delayFeedbackValue').textContent = `${delayFeedbackSlider.value}%`;

    // Volume
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeVal = parseFloat(volumeSlider.value) / 100;
    masterGain.gain.setTargetAtTime(volumeVal, audioCtx.currentTime, 0.05);
    document.getElementById('volumeValue').textContent = `${volumeSlider.value}%`;
}

// --- SYNTHESIZE KEY STRIKE (PHYSICAL MODELING) ---
function playNoteAudio(freq, relativeY = 0.5) {
    if (!audioCtx) return;
    
    // Resume context if suspended (browser security)
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }

    const now = audioCtx.currentTime;

    // --- PHYSICS-BASED EXCITATION MODELING ---
    // relativeY represents top (0.0) to bottom (1.0) of the bar.
    // Vibrational nodes (mounting screws) are at 0.224 and 0.776.
    const distToNode = Math.min(Math.abs(relativeY - 0.224), Math.abs(relativeY - 0.776));
    const distToCenter = Math.abs(relativeY - 0.5);

    // 1. Damping factor: Hitting close to nodes (screws) dampens the sound (shorter sustain, quieter)
    // Node regions absorb fundamental vibrations.
    const damping = distToNode < 0.08 ? 0.35 + 0.65 * (distToNode / 0.08) : 1.0;

    // 2. Fundamental Excitation: Strongest at the center (0.5), drops severely near node screws.
    const nodeGate = distToNode < 0.12 ? 0.2 + 0.8 * (distToNode / 0.12) : 1.0;
    const fundamentalExcitation = (0.3 + 0.7 * Math.sin(relativeY * Math.PI)) * nodeGate;

    // 3. High-frequency / Overtone Excitation: Hitting ends (0.0 or 1.0) excites high overtones strongly.
    // Mallet click transient is louder and sharper near the ends.
    const clickVolumeScale = 0.5 + distToCenter * 1.2; 
    const overtoneScale = 0.6 + distToCenter * 0.9;

    // Timbre parameters based on Mallet material
    let fundamentalDecay = 2.0;
    let overtoneDecay1 = 0.8;
    let overtoneDecay2 = 0.4;
    let overtoneDecay3 = 0.2;

    let fundVol = 0.6;
    let otVol1 = 0.3;
    let otVol2 = 0.2;
    let otVol3 = 0.1;

    let clickVol = 0.15;
    let clickFreq = 6000;
    let clickDecay = 0.008;

    if (currentMallet === 'brass') { // Hard brass - bright and rings
        fundamentalDecay = 2.5;
        overtoneDecay1 = 1.6;
        overtoneDecay2 = 0.9;
        overtoneDecay3 = 0.5;

        fundVol = 0.5;
        otVol1 = 0.45;
        otVol2 = 0.35;
        otVol3 = 0.25;

        clickVol = 0.35;
        clickFreq = 7500;
        clickDecay = 0.012;
    } else if (currentMallet === 'rubber') { // Soft rubber - warm and quiet
        fundamentalDecay = 1.8;
        overtoneDecay1 = 0.35;
        overtoneDecay2 = 0.15;
        overtoneDecay3 = 0.05;

        fundVol = 0.75;
        otVol1 = 0.15;
        otVol2 = 0.05;
        otVol3 = 0.01;

        clickVol = 0.08;
        clickFreq = 2800;
        clickDecay = 0.015;
    }

    // Apply physics scaling factors
    fundamentalDecay *= damping;
    overtoneDecay1 *= damping;
    overtoneDecay2 *= damping;
    overtoneDecay3 *= damping;

    // A note contains fundamental + 3 inharmonic overtones
    const partials = [
        { ratio: 1.0, vol: fundVol * fundamentalExcitation * damping, decay: fundamentalDecay },
        { ratio: 2.76, vol: otVol1 * overtoneScale * damping, decay: overtoneDecay1 },
        { ratio: 5.40, vol: otVol2 * overtoneScale * damping, decay: overtoneDecay2 },
        { ratio: 8.93, vol: otVol3 * overtoneScale * damping, decay: overtoneDecay3 }
    ];

    // Note mix bus
    const noteGain = audioCtx.createGain();
    noteGain.gain.setValueAtTime(1.0, now);
    noteGain.connect(analyser);

    // Spawn oscillators
    partials.forEach(p => {
        const osc = audioCtx.createOscillator();
        const gainNode = audioCtx.createGain();

        // Use Sine waves for glockenspiel
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * p.ratio, now);

        gainNode.gain.setValueAtTime(0, now);
        // Fast attack
        gainNode.gain.linearRampToValueAtTime(p.vol, now + 0.002);
        // Exponential decay using setTargetAtTime
        gainNode.gain.setTargetAtTime(0, now + 0.002, p.decay / 4);

        osc.connect(gainNode);
        gainNode.connect(noteGain);

        osc.start(now);
        // Stop oscillator after it has completely decayed to save CPU
        osc.stop(now + p.decay * 4);
    });

    // Mallet Click noise transient (louder at ends, dampened near nodes)
    const clickOsc = audioCtx.createOscillator();
    const clickGain = audioCtx.createGain();
    clickOsc.type = 'triangle';
    clickOsc.frequency.setValueAtTime(clickFreq, now);

    const finalClickVol = clickVol * clickVolumeScale * (damping * 0.7 + 0.3);
    clickGain.gain.setValueAtTime(finalClickVol, now);
    clickGain.gain.exponentialRampToValueAtTime(0.0001, now + clickDecay);
    
    clickOsc.connect(clickGain);
    clickGain.connect(noteGain);
    clickOsc.start(now);
    clickOsc.stop(now + clickDecay * 1.5);
}

// --- METRONOME ENGINE ---
function metronomeScheduler() {
    while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime) {
        scheduleBeat(currentBeat, nextNoteTime);
        advanceBeat();
    }
}

function advanceBeat() {
    const secondsPerBeat = 60.0 / bpm;
    nextNoteTime += secondsPerBeat;
    currentBeat = (currentBeat + 1) % beatsPerBar;
}

function scheduleBeat(beatNumber, time) {
    if (!audioCtx) return;

    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();

    osc.type = 'sine';
    const isAccent = beatNumber === 0;
    // Beat 1 is accented (higher woodblock-like pitch at 1200Hz), others are at 800Hz
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.2, time + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gainNode);
    gainNode.connect(analyser); // connect to analyser so it visualizes the click too!

    osc.start(time);
    osc.stop(time + 0.05);

    // Trigger visual flash synchronized with audio time
    const delayMs = (time - audioCtx.currentTime) * 1000;
    setTimeout(() => {
        triggerMetronomeLedFlash(isAccent);
    }, Math.max(0, delayMs));
}

function triggerMetronomeLedFlash(isAccent) {
    const led = document.getElementById('metronomeLed');
    if (!led) return;

    const flashClass = isAccent ? 'flash-accent' : 'flash-normal';
    led.classList.add(flashClass);

    setTimeout(() => {
        led.classList.remove('flash-accent', 'flash-normal');
    }, 100);
}

function toggleMetronome() {
    if (!audioCtx) initAudio();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const btn = document.getElementById('metronomeToggleBtn');

    if (!isPlayingMetronome) {
        isPlayingMetronome = true;
        currentBeat = 0;
        nextNoteTime = audioCtx.currentTime + 0.05;
        metronomeTimer = setInterval(metronomeScheduler, lookahead);
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
        btn.innerHTML = '<span class="btn-icon">■</span>ストップ';
    } else {
        isPlayingMetronome = false;
        clearInterval(metronomeTimer);
        metronomeTimer = null;
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.innerHTML = '<span class="btn-icon">▶</span>スタート';
    }
}

// --- VISUAL EFFECTS ENGINE ---

// Spawn spark particles upon striking a note
function spawnParticles(x, y, noteColor) {
    const pCount = Math.floor(Math.random() * 12) + 12;
    const sparkColor = Math.random() > 0.5 ? '#00f0ff' : '#ff6a00';
    
    for (let i = 0; i < pCount; i++) {
        const isNote = Math.random() > 0.7; // 30% chance of note particle
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 4 + 2;
        
        if (isNote) {
            const symbols = ['♪', '♫', '♬', '♩'];
            particles.push({
                type: 'note',
                symbol: symbols[Math.floor(Math.random() * symbols.length)],
                x: x,
                y: y,
                vx: (Math.random() - 0.5) * 1.5,
                vy: -(Math.random() * 2 + 1),
                size: Math.random() * 6 + 12,
                color: noteColor,
                alpha: 1.0,
                decay: Math.random() * 0.015 + 0.01
            });
        } else {
            particles.push({
                type: 'spark',
                x: x,
                y: y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed - 1.5,
                size: Math.random() * 3 + 1.5,
                color: sparkColor,
                alpha: 1.0,
                decay: Math.random() * 0.03 + 0.02
            });
        }
    }
}

// Animate sparkles and visual elements
function animate() {
    // 1. Particle and glow Canvas Animation
    effectsCtx.clearRect(0, 0, effectsCanvas.width, effectsCanvas.height);
    
    // Draw and update active key glows
    Object.keys(activeKeyGlows).forEach(note => {
        if (activeKeyGlows[note] > 0.01) {
            activeKeyGlows[note] *= 0.92; // exponential fade
            
            const keyEl = document.querySelector(`.key[data-note="${note}"]`);
            if (keyEl) {
                const rect = keyEl.getBoundingClientRect();
                const frameRect = document.querySelector('.glockenspiel-frame').getBoundingClientRect();
                const x = rect.left - frameRect.left + rect.width / 2;
                const y = rect.top - frameRect.top + rect.height / 2;
                
                // Draw ripple glow ring
                const gradient = effectsCtx.createRadialGradient(x, y, 5, x, y, rect.width * 1.5 * (1 - activeKeyGlows[note]));
                const color = note.includes('#') ? '255, 0, 127' : '0, 240, 255';
                gradient.addColorStop(0, `rgba(${color}, 0)`);
                gradient.addColorStop(0.5, `rgba(${color}, ${activeKeyGlows[note] * 0.4})`);
                gradient.addColorStop(1, `rgba(${color}, 0)`);
                
                effectsCtx.fillStyle = gradient;
                effectsCtx.beginPath();
                effectsCtx.arc(x, y, rect.width * 1.5, 0, Math.PI * 2);
                effectsCtx.fill();
            }
        } else {
            delete activeKeyGlows[note];
        }
    });

    // Update & draw particles
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i];
        p.x += p.vx;
        p.y += p.vy;
        if (p.type === 'spark') {
            p.vy += 0.08; // gravity for sparks
        }
        p.alpha -= p.decay;
        
        if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
        }

        effectsCtx.save();
        effectsCtx.translate(p.x, p.y);
        effectsCtx.globalAlpha = p.alpha;
        effectsCtx.fillStyle = p.color;
        effectsCtx.shadowBlur = 8;
        effectsCtx.shadowColor = p.color;

        if (p.type === 'note') {
            effectsCtx.font = `bold ${p.size}px 'Outfit', sans-serif`;
            effectsCtx.textAlign = 'center';
            effectsCtx.textBaseline = 'middle';
            effectsCtx.fillText(p.symbol, 0, 0);
        } else {
            // Draw diamond/spark shape
            effectsCtx.beginPath();
            effectsCtx.moveTo(0, -p.size * 2);
            effectsCtx.lineTo(p.size, 0);
            effectsCtx.lineTo(0, p.size * 2);
            effectsCtx.lineTo(-p.size, 0);
            effectsCtx.closePath();
            effectsCtx.fill();
        }
        effectsCtx.restore();
    }


    // 3. Audio Visualizer Canvas
    drawVisualizer();

    requestAnimationFrame(animate);
}

// Draw Audio Waveform (Oscilloscope)
function drawVisualizer() {
    visualizerCtx.clearRect(0, 0, visualizerCanvas.width, visualizerCanvas.height);
    
    if (!analyser) {
        // Draw flat line when silent
        visualizerCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        visualizerCtx.lineWidth = 2;
        visualizerCtx.beginPath();
        visualizerCtx.moveTo(0, visualizerCanvas.height / 2);
        visualizerCtx.lineTo(visualizerCanvas.width, visualizerCanvas.height / 2);
        visualizerCtx.stroke();
        return;
    }

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    analyser.getByteTimeDomainData(dataArray);

    visualizerCtx.lineWidth = 3;
    
    // Draw neon cyan glowing wave
    const grad = visualizerCtx.createLinearGradient(0, 0, visualizerCanvas.width, 0);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 0, 127, 0.8)');
    grad.addColorStop(1, 'rgba(255, 183, 0, 0.8)');
    
    visualizerCtx.strokeStyle = grad;
    visualizerCtx.shadowBlur = 10;
    visualizerCtx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    visualizerCtx.beginPath();

    const sliceWidth = visualizerCanvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = v * visualizerCanvas.height / 2;

        if (i === 0) {
            visualizerCtx.moveTo(x, y);
        } else {
            visualizerCtx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    visualizerCtx.lineTo(visualizerCanvas.width, visualizerCanvas.height / 2);
    visualizerCtx.stroke();
    visualizerCtx.shadowBlur = 0; // reset
}

// --- INTERACTIVE EVENTS & INPUTS ---

// Map a note play to UI elements and audio
function strikeNote(noteName, relativeY = 0.5) {
    if (!audioCtx) {
        initAudio();
    }
    
    const keyEl = document.querySelector(`.key[data-note="${noteName}"]`);
    if (!keyEl) return;

    // Trigger visual action on key
    keyEl.classList.add('active');
    setTimeout(() => keyEl.classList.remove('active'), 100);

    const freq = parseFloat(keyEl.getAttribute('data-freq'));
    playNoteAudio(freq, relativeY);

    // Get key center coordinate for particles
    const rect = keyEl.getBoundingClientRect();
    const frameRect = document.querySelector('.glockenspiel-frame').getBoundingClientRect();
    const x = rect.left - frameRect.left + rect.width / 2;
    const y = rect.top - frameRect.top + rect.height / 2;

    const color = noteName.includes('#') ? 'var(--glow-magenta)' : 'var(--glow-cyan)';
    activeKeyGlows[noteName] = 1.0;
    spawnParticles(x, y, color);

    // Broadcast note strike to peers
    if (peer && connections.length > 0) {
        broadcast({
            type: 'strike',
            note: noteName,
            relativeY: relativeY
        });
    }

    // Handle recording
    if (isRecording) {
        recordedNotes.push({
            note: noteName,
            time: Date.now() - recordStartTime
        });
        document.getElementById('recordStatus').textContent = `録音中... (${recordedNotes.length} 音)`;
    }


}

// Setup click, slide, touch, and keyboard events
function setupEventListeners() {
    const keys = document.querySelectorAll('.key');
    let isMouseDown = false;

    // Mouse Controls
    keys.forEach(k => {
        k.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            const rect = k.getBoundingClientRect();
            const relativeY = (e.clientY - rect.top) / rect.height;
            strikeNote(k.getAttribute('data-note'), relativeY);
        });

        k.addEventListener('mouseenter', () => {
            if (isMouseDown) {
                strikeNote(k.getAttribute('data-note'), 0.5); // Slide plays center tone
            }
        });
    });

    window.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    // Touch controls (Multi-touch support)
    const container = document.getElementById('keysContainer');
    let activeTouches = {};

    container.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!audioCtx) initAudio();
        
        Array.from(e.changedTouches).forEach(touch => {
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const keyEl = el ? el.closest('.key') : null;
            if (keyEl) {
                const rect = keyEl.getBoundingClientRect();
                const relativeY = (touch.clientY - rect.top) / rect.height;
                const note = keyEl.getAttribute('data-note');
                strikeNote(note, relativeY);
                activeTouches[touch.identifier] = note;
            }
        });
    }, { passive: false });

    container.addEventListener('touchmove', (e) => {
        e.preventDefault();
        Array.from(e.changedTouches).forEach(touch => {
            const el = document.elementFromPoint(touch.clientX, touch.clientY);
            const keyEl = el ? el.closest('.key') : null;
            if (keyEl) {
                const note = keyEl.getAttribute('data-note');
                if (activeTouches[touch.identifier] !== note) {
                    const rect = keyEl.getBoundingClientRect();
                    const relativeY = (touch.clientY - rect.top) / rect.height;
                    strikeNote(note, relativeY);
                    activeTouches[touch.identifier] = note;
                }
            }
        });
    }, { passive: false });

    container.addEventListener('touchend', (e) => {
        Array.from(e.changedTouches).forEach(touch => {
            delete activeTouches[touch.identifier];
        });
    });

    // Keyboard controls
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (KEY_MAP[key]) {
            // Prevent multiple triggers from holding key down
            if (e.repeat) return;
            strikeNote(KEY_MAP[key]);
        }
    });

    // Effect Sliders
    document.getElementById('reverbSlider').addEventListener('input', updateEffects);
    document.getElementById('delayTimeSlider').addEventListener('input', updateEffects);
    document.getElementById('delayFeedbackSlider').addEventListener('input', updateEffects);
    document.getElementById('volumeSlider').addEventListener('input', updateEffects);

    // Mallet Select
    document.getElementById('malletSelect').addEventListener('change', (e) => {
        currentMallet = e.target.value;
        updateMalletHeadStyle();
    });

    // Mouse movement tracking for mallet
    let lastMouseMoveTime = 0;
    document.addEventListener('mousemove', (e) => {
        if (isTouchDevice || !customMallet) return;
        
        const isOverInstrument = e.target.closest('.instrument-container') !== null;
        
        if (isOverInstrument) {
            customMallet.style.display = 'block';
            customMallet.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        } else {
            customMallet.style.display = 'none';
        }

        // Broadcast mouse position to peers
        const now = Date.now();
        if (now - lastMouseMoveTime > 40) { // throttle to ~25fps updates
            if (peer && connections.length > 0 && multiplayerMode !== 'grand') {
                const instContainer = document.querySelector('.instrument-container');
                const rect = instContainer.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const isOver = x >= 0 && x <= 1 && y >= 0 && y <= 1;

                broadcast({
                    type: 'mousemove',
                    x: isOver ? x : -100, // offscreen
                    y: isOver ? y : -100,
                    malletType: currentMallet,
                    isStriking: customMallet.classList.contains('striking')
                });
            }
            lastMouseMoveTime = now;
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!isTouchDevice && customMallet && e.target.closest('.instrument-container')) {
            customMallet.classList.add('striking');

            // Send immediate strike state update to peers
            if (peer && connections.length > 0 && multiplayerMode !== 'grand') {
                const instContainer = document.querySelector('.instrument-container');
                const rect = instContainer.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const isOver = x >= 0 && x <= 1 && y >= 0 && y <= 1;

                broadcast({
                    type: 'mousemove',
                    x: isOver ? x : -100,
                    y: isOver ? y : -100,
                    malletType: currentMallet,
                    isStriking: true
                });
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (customMallet) {
            customMallet.classList.remove('striking');

            // Send immediate strike release state update to peers
            if (peer && connections.length > 0 && multiplayerMode !== 'grand') {
                broadcast({
                    type: 'mousemove',
                    x: -100,
                    y: -100,
                    malletType: currentMallet,
                    isStriking: false
                });
            }
        }
    });

    // Touch device detection to hide mallet
    document.addEventListener('touchstart', () => {
        isTouchDevice = true;
        if (customMallet) {
            customMallet.style.display = 'none';
        }
    }, { passive: true });

    // Copy URL button listener
    document.getElementById('copyShareUrlBtn').addEventListener('click', () => {
        const shareUrlInput = document.getElementById('shareUrlInput');
        shareUrlInput.select();
        shareUrlInput.setSelectionRange(0, 99999); // for mobile
        navigator.clipboard.writeText(shareUrlInput.value)
            .then(() => {
                const btn = document.getElementById('copyShareUrlBtn');
                const origText = btn.innerHTML;
                btn.textContent = 'コピーしました！';
                btn.classList.remove('btn-primary');
                btn.classList.add('btn-success');
                setTimeout(() => {
                    btn.innerHTML = origText;
                    btn.classList.add('btn-primary');
                    btn.classList.remove('btn-success');
                }, 2000);
            });
    });
    // Reconnect button listener
    document.getElementById('reconnectBtn').addEventListener('click', () => {
        if (peer) {
            try {
                peer.destroy();
            } catch (e) {
                console.error(e);
            }
            peer = null;
        }
        initMultiplayer(roomId);
    });

    // Join Grand Arena button listener
    document.getElementById('joinGrandArenaBtn').addEventListener('click', () => {
        switchMultiplayerMode('grand');
    });

    // Join Quick Match button listener
    document.getElementById('joinQuickMatchBtn').addEventListener('click', () => {
        switchMultiplayerMode('quick');
    });

    // Create Private Room button listener
    document.getElementById('createPrivateRoomBtn').addEventListener('click', () => {
        switchMultiplayerMode('private');
    });

    // Keyboard label toggle
    document.getElementById('toggleKeyboardLabels').addEventListener('change', (e) => {
        isLabelsVisible = e.target.checked;
        const keysFrame = document.querySelector('.keys-container');
        if (isLabelsVisible) {
            keysFrame.classList.remove('hide-labels');
        } else {
            keysFrame.classList.add('hide-labels');
        }
    });

    // Metronome Event Listeners
    const bpmSlider = document.getElementById('bpmSlider');
    const bpmInput = document.getElementById('bpmInput');
    const bpmValueLabel = document.getElementById('bpmValue');
    const beatSelect = document.getElementById('beatSelect');
    const metronomeToggleBtn = document.getElementById('metronomeToggleBtn');

    function updateBpm(newBpm) {
        bpm = Math.min(Math.max(parseInt(newBpm) || 120, 40), 240);
        bpmSlider.value = bpm;
        bpmInput.value = bpm;
        bpmValueLabel.textContent = bpm;
    }

    bpmSlider.addEventListener('input', (e) => {
        updateBpm(e.target.value);
    });

    bpmInput.addEventListener('change', (e) => {
        updateBpm(e.target.value);
    });

    beatSelect.addEventListener('change', (e) => {
        beatsPerBar = parseInt(e.target.value) || 4;
        currentBeat = 0; // reset beat alignment
    });

    metronomeToggleBtn.addEventListener('click', toggleMetronome);


    // Recording Controls
    const recordBtn = document.getElementById('recordBtn');
    const playRecordBtn = document.getElementById('playRecordBtn');
    const clearRecordBtn = document.getElementById('clearRecordBtn');

    recordBtn.addEventListener('click', toggleRecording);
    playRecordBtn.addEventListener('click', playRecordedSequence);
    clearRecordBtn.addEventListener('click', clearRecording);
}

// --- RECORDING STUDIO IMPLEMENTATION ---

function toggleRecording() {
    if (!audioCtx) initAudio();

    const recordBtn = document.getElementById('recordBtn');
    const playRecordBtn = document.getElementById('playRecordBtn');
    const clearRecordBtn = document.getElementById('clearRecordBtn');

    if (!isRecording) {
        // Start Recording
        isRecording = true;
        recordedNotes = [];
        recordStartTime = Date.now();
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<span class="record-dot"></span> 録音中...';
        document.getElementById('recordStatus').textContent = '演奏を録音中。鍵盤を押してください...';
        document.getElementById('recordStatus').classList.add('active');

        // Disable playback during recording
        playRecordBtn.disabled = true;
        clearRecordBtn.disabled = true;
    } else {
        // Stop Recording
        isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<span class="record-dot"></span> 録音';
        document.getElementById('recordStatus').classList.remove('active');

        if (recordedNotes.length > 0) {
            document.getElementById('recordStatus').textContent = `録音完了: ${recordedNotes.length} 音`;
            playRecordBtn.disabled = false;
            clearRecordBtn.disabled = false;
        } else {
            document.getElementById('recordStatus').textContent = '音符が記録されませんでした。';
            playRecordBtn.disabled = true;
            clearRecordBtn.disabled = true;
        }
    }
}

function playRecordedSequence() {
    if (recordedNotes.length === 0 || isPlayingRecording) return;

    if (!audioCtx) initAudio();

    isPlayingRecording = true;
    document.getElementById('playRecordBtn').disabled = true;
    document.getElementById('recordBtn').disabled = true;
    document.getElementById('recordStatus').textContent = '再生中...';
    
    // Schedule notes
    recordedNotes.forEach(noteObj => {
        const timeout = setTimeout(() => {
            strikeNote(noteObj.note);
        }, noteObj.time);
        playbackTimeouts.push(timeout);
    });

    // End of playback detection
    const totalTime = recordedNotes[recordedNotes.length - 1].time + 1500;
    const endTimeout = setTimeout(() => {
        stopPlayback();
    }, totalTime);
    playbackTimeouts.push(endTimeout);
}

function stopPlayback() {
    isPlayingRecording = false;
    playbackTimeouts.forEach(clearTimeout);
    playbackTimeouts = [];
    document.getElementById('playRecordBtn').disabled = false;
    document.getElementById('recordBtn').disabled = false;
    document.getElementById('recordStatus').textContent = `録音データ: ${recordedNotes.length} 音`;
}

function clearRecording() {
    stopPlayback();
    recordedNotes = [];
    document.getElementById('playRecordBtn').disabled = true;
    document.getElementById('clearRecordBtn').disabled = true;
    document.getElementById('recordStatus').textContent = '録音されていません。';
}


// --- MULTIPLAYER (WEBRTC PEERJS) ENGINE ---

function initMultiplayer(id) {
    updateStatusUI('connecting', '接続サーバーにログイン中...');

    // P2P connections are arbitrated by the PeerJS cloud signaling server
    localPeerId = isHost ? id : `GUEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    peer = new Peer(localPeerId, {
        debug: 1 // Print warnings and errors only
    });

    // 接続タイムアウト処理（シグナリングサーバーから応答がない場合）
    let loginTimeout = setTimeout(() => {
        if (peer && !peer.open) {
            updateStatusUI('disconnected', '接続タイムアウト (広告ブロックや回線制限の可能性があります)');
        }
    }, 8000);

    peer.on('open', () => {
        clearTimeout(loginTimeout);
        console.log('PeerJS server connection open. My Peer ID:', localPeerId);
        setupShareUI();
        
        if (isHost) {
            updateStatusUI('connected', 'ホストとして待機中');
            // Host waits for guests to connect
            peer.on('connection', (conn) => {
                handleIncomingConnection(conn);
            });
        } else {
            updateStatusUI('connecting', 'ホストに接続中...');
            // Guest connects to Host
            const conn = peer.connect(id);
            handleOutgoingConnection(conn);
        }
    });

    peer.on('error', (err) => {
        clearTimeout(loginTimeout);
        console.error('PeerJS error:', err);
        updateStatusUI('disconnected', `接続エラー (${err.type})`);
        
        if (err.type === 'unavailable-id' || err.type === 'id-taken-on-server') {
            console.warn('Room ID is taken on server. Connecting as guest instead...');
            if (peer) {
                try {
                    peer.destroy();
                } catch(e) {
                    console.error(e);
                }
                peer = null;
            }
            isHost = false; // Downgrade to guest since the ID is already hosted!
            updateModeIndicator();
            setTimeout(() => {
                initMultiplayer(roomId);
            }, 1000);
            return;
        }
        
        if (err.type === 'peer-not-found' && !isHost) {
            if (peer) {
                try {
                    peer.destroy();
                } catch(e) {
                    console.error(e);
                }
                peer = null;
            }
            if (isSearchingQuickMatch) {
                console.log(`Band ${currentQuickMatchIndex} is empty. Hosting this band!`);
                isSearchingQuickMatch = false;
                isHost = true;
                updateModeIndicator();
                setTimeout(() => initMultiplayer(roomId), 1000);
            } else {
                console.log('Host not found. Hosting the current room ID...');
                isHost = true;
                updateModeIndicator();
                setTimeout(() => initMultiplayer(roomId), 1000);
            }
        }
    });
}

function handleIncomingConnection(conn) {
    if (multiplayerMode === 'quick' && connections.length >= 4) {
        console.log('Quick Match Room is full! Rejecting guest:', conn.peer);
        conn.on('open', () => {
            conn.send({ type: 'room_full' });
            setTimeout(() => {
                conn.close();
            }, 300);
        });
        return;
    }

    conn.on('open', () => {
        console.log('Guest connected:', conn.peer);
        connections.push(conn);
        assignGuestColor(conn.peer);
        updatePeerCountUI();
        updateStatusUI('connected', `セッション接続中`);
        
        // Notify other guests about new peer
        broadcast({
            type: 'peer_joined',
            peerId: conn.peer
        }, conn.peer); // exclude the new guest
        
        // Sync guest list
        syncGuestsList();
    });

    conn.on('data', (data) => {
        handleDataMessage(data, conn.peer);
    });

    conn.on('close', () => {
        console.log('Guest disconnected:', conn.peer);
        removeConnection(conn);
    });
    
    conn.on('error', () => removeConnection(conn));
}

function handleOutgoingConnection(conn) {
    conn.on('open', () => {
        console.log('Connected to Host!');
        connections.push(conn);
        updateStatusUI('connected', `セッション接続中`);
        
        if (isSearchingQuickMatch) {
            isSearchingQuickMatch = false;
            updateModeIndicator();
        }
    });

    conn.on('data', (data) => {
        handleDataMessage(data, conn.peer);
    });

    conn.on('close', () => {
        console.log('Host disconnected.');
        updateStatusUI('disconnected', '接続が切断されました');
        removeConnection(conn);
        
        if (isSearchingQuickMatch && isQuickMatchRoomFull) {
            isQuickMatchRoomFull = false;
            if (peer) {
                try {
                    peer.destroy();
                } catch (e) {
                    console.error(e);
                }
                peer = null;
            }
            currentQuickMatchIndex++;
            setTimeout(() => {
                startQuickMatchSearch();
            }, 1000);
        } else if (!isHost) {
            handleHostDisconnect();
        }
    });
    
    conn.on('error', () => removeConnection(conn));
}

function handleDataMessage(data, senderId) {
    if (data.type === 'strike') {
        playReceivedStrike(data.note, data.relativeY, senderId);
        
        if (isHost) {
            broadcast(data, senderId);
        }
    } else if (data.type === 'mousemove') {
        if (multiplayerMode !== 'grand') {
            updateGuestMallet(senderId, data.x, data.y, data.malletType, data.isStriking);
            
            if (isHost) {
                broadcast(data, senderId);
            }
        }
    } else if (data.type === 'peer_joined') {
        assignGuestColor(data.peerId);
    } else if (data.type === 'peer_left') {
        removeGuestMallet(data.peerId);
    } else if (data.type === 'sync_guests') {
        allGuests = data.guests;
        console.log('Synced guests list from host:', allGuests);
    } else if (data.type === 'room_full') {
        console.log(`Room ${roomId} is full! Moving to next room...`);
        isQuickMatchRoomFull = true;
    }
}

function broadcast(message, excludePeerId = null) {
    connections.forEach(conn => {
        if (conn.peer !== excludePeerId && conn.open) {
            conn.send(message);
        }
    });
}

function playReceivedStrike(note, relativeY, senderId) {
    const colorIndex = guestColors[senderId] || 1;
    let color = 'var(--glow-cyan)';
    if (colorIndex === 1) color = '#ff007f';
    else if (colorIndex === 2) color = '#ffb700';
    else if (colorIndex === 3) color = '#39ff14';
    else if (colorIndex === 4) color = '#bd00ff';
    
    const keyEl = document.querySelector(`.key[data-note="${note}"]`);
    if (keyEl) {
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 100);
        
        const freq = parseFloat(keyEl.getAttribute('data-freq'));
        playNoteAudio(freq, relativeY);
        
        const rect = keyEl.getBoundingClientRect();
        const frameRect = document.querySelector('.glockenspiel-frame').getBoundingClientRect();
        const x = rect.left - frameRect.left + rect.width / 2;
        const y = rect.top - frameRect.top + rect.height / 2;
        
        activeKeyGlows[note] = 1.0;
        spawnParticles(x, y, color);
    }
}

function updateGuestMallet(peerId, x, y, malletType, isStriking) {
    let malletEl = guestMallets[peerId];
    if (!malletEl) {
        malletEl = document.createElement('div');
        malletEl.className = 'custom-mallet guest';
        
        const colorIdx = guestColors[peerId] || assignGuestColor(peerId);
        malletEl.classList.add(`guest-${colorIdx}`);
        
        malletEl.innerHTML = `
            <div class="mallet-inner">
                <div class="mallet-head ${malletType}"></div>
                <div class="mallet-shaft"></div>
            </div>
        `;
        document.body.appendChild(malletEl);
        guestMallets[peerId] = malletEl;
    }
    
    if (x < 0) {
        malletEl.style.display = 'none';
        return;
    }
    
    const instContainer = document.querySelector('.instrument-container');
    if (instContainer) {
        const rect = instContainer.getBoundingClientRect();
        const clientX = rect.left + x * rect.width;
        const clientY = rect.top + y * rect.height;
        
        malletEl.style.display = 'block';
        malletEl.style.transform = `translate3d(${clientX}px, ${clientY}px, 0)`;
    }
    
    const head = malletEl.querySelector('.mallet-head');
    if (head) {
        head.className = `mallet-head ${malletType}`;
    }
    
    if (isStriking) {
        malletEl.classList.add('striking');
    } else {
        malletEl.classList.remove('striking');
    }
}

function assignGuestColor(peerId) {
    if (guestColors[peerId]) return guestColors[peerId];
    
    guestColorIndex = (guestColorIndex % 4) + 1;
    guestColors[peerId] = guestColorIndex;
    return guestColorIndex;
}

function removeGuestMallet(peerId) {
    const malletEl = guestMallets[peerId];
    if (malletEl) {
        malletEl.remove();
        delete guestMallets[peerId];
    }
    delete guestColors[peerId];
    updatePeerCountUI();
}

function removeConnection(conn) {
    const index = connections.indexOf(conn);
    if (index > -1) {
        connections.splice(index, 1);
    }
    removeGuestMallet(conn.peer);
    
    if (isHost) {
        broadcast({
            type: 'peer_left',
            peerId: conn.peer
        });
        // Sync guest list
        syncGuestsList();
    }
    
    updatePeerCountUI();
    if (connections.length === 0) {
        if (isHost) {
            updateStatusUI('connected', 'ホストとして待機中');
        } else {
            updateStatusUI('disconnected', '接続が切断されました');
        }
    }
}

function syncGuestsList() {
    if (!isHost) return;
    const guestList = connections.filter(c => c.open).map(c => c.peer);
    broadcast({
        type: 'sync_guests',
        guests: guestList
    });
}

function handleHostDisconnect() {
    console.log('Host disconnected. Starting failover logic. Guests in room:', allGuests);
    updateStatusUI('connecting', 'ホスト切断のため再接続中...');

    // Filter out empty entries and sort guests alphabetically
    const activeGuests = [...allGuests].filter(id => id).sort();
    
    // Clean up phantom mallets
    Object.keys(guestMallets).forEach(peerId => {
        removeGuestMallet(peerId);
    });

    if (activeGuests.length === 0 || localPeerId === activeGuests[0]) {
        // I am the successor! Promote to Host!
        console.log('I am the successor. Re-registering as Host in 2.5s...');
        isHost = true;
        updateModeIndicator();
        
        if (peer) {
            try {
                peer.destroy();
            } catch (e) {
                console.error(e);
            }
            peer = null;
        }
        
        setTimeout(() => {
            console.log('Promoting to host now with ID:', roomId);
            initMultiplayer(roomId);
        }, 2500);
    } else {
        // I am a guest. Wait for the successor to register as host, then connect
        console.log(`Successor is ${activeGuests[0]}. Waiting 5s to reconnect...`);
        isHost = false;
        updateModeIndicator();
        
        if (peer) {
            try {
                peer.destroy();
            } catch (e) {
                console.error(e);
            }
            peer = null;
        }
        
        setTimeout(() => {
            console.log('Connecting to new host now...');
            initMultiplayer(roomId);
        }, 5000);
    }
}

function setupShareUI() {
    const shareUrlInput = document.getElementById('shareUrlInput');
    const copyBtn = document.getElementById('copyShareUrlBtn');
    
    const shareUrl = `${window.location.origin}${window.location.pathname}#${roomId}`;
    shareUrlInput.value = shareUrl;
    copyBtn.disabled = false;
}

function switchMultiplayerMode(mode) {
    if (isSearchingQuickMatch) return;
    
    console.log(`Switching multiplayer mode to: ${mode}`);
    multiplayerMode = mode;
    
    if (peer) {
        try {
            peer.destroy();
        } catch (e) {
            console.error(e);
        }
        peer = null;
    }
    
    Object.keys(guestMallets).forEach(peerId => {
        removeGuestMallet(peerId);
    });
    connections = [];
    updatePeerCountUI();

    if (mode === 'grand') {
        isHost = false; // Join as guest first, auto-failover handles hosting
        roomId = 'TEKKIN-GRAND-ARENA-JAMYLAS';
        window.location.hash = roomId;
        updateModeIndicator();
        initMultiplayer(roomId);
    } else if (mode === 'quick') {
        isHost = false;
        currentQuickMatchIndex = 1;
        isSearchingQuickMatch = true;
        startQuickMatchSearch();
    } else if (mode === 'private') {
        isHost = true;
        const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
        roomId = `TEKKIN-${randId}`;
        window.location.hash = roomId;
        updateModeIndicator();
        initMultiplayer(roomId);
    }
}

function startQuickMatchSearch() {
    if (currentQuickMatchIndex > 5) {
        console.log('All public bands are full. Creating a temporary private band...');
        isSearchingQuickMatch = false;
        multiplayerMode = 'private';
        isHost = true;
        const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
        roomId = `TEKKIN-BAND-TEMP-${randId}`;
        window.location.hash = roomId;
        updateModeIndicator();
        initMultiplayer(roomId);
        return;
    }

    console.log(`Quick Match: Checking Band ${currentQuickMatchIndex}...`);
    roomId = `TEKKIN-BAND-JAMYLAS-${currentQuickMatchIndex}`;
    window.location.hash = roomId;
    updateModeIndicator(`野良合奏 (バンド ${currentQuickMatchIndex} 検索中...)`);
    initMultiplayer(roomId);
}

function updateModeIndicator(customText = null) {
    const indicator = document.getElementById('modeIndicator');
    if (!indicator) return;

    if (customText) {
        indicator.textContent = `接続モード: ${customText}`;
        return;
    }

    let modeName = '';
    if (multiplayerMode === 'grand') {
        modeName = '公開アリーナ (全員合奏・マレット非表示)';
    } else if (multiplayerMode === 'quick') {
        modeName = `野良合奏 (バンド: ${roomId.replace('TEKKIN-', '')})`;
    } else if (multiplayerMode === 'private') {
        modeName = `非公開ルーム (ID: ${roomId.replace('TEKKIN-', '')})`;
    }
    indicator.textContent = `接続モード: ${modeName}`;
}

function updateStatusUI(statusClass, text) {
    const dot = document.getElementById('statusDot');
    const txt = document.getElementById('statusText');
    const reconnectBtn = document.getElementById('reconnectBtn');
    if (!dot || !txt) return;

    dot.className = `status-dot ${statusClass}`;
    txt.textContent = text;

    if (reconnectBtn) {
        if (statusClass === 'disconnected') {
            reconnectBtn.style.display = 'inline-block';
        } else {
            reconnectBtn.style.display = 'none';
        }
    }
}

function updatePeerCountUI() {
    const label = document.getElementById('peerCountLabel');
    if (!label) return;

    const count = connections.length;
    if (count > 0) {
        label.style.display = 'inline';
        label.textContent = `(接続人数: ${count + 1}人)`;
    } else {
        label.style.display = 'none';
    }
}

function renderKeyboard() {
    const container = document.getElementById('keysContainer');
    if (!container) return;

    // Separate naturals and accidentals
    const naturals = NOTES_CONFIG.filter(n => n.type === 'natural');
    const accidentals = NOTES_CONFIG.filter(n => n.type === 'accidental');

    // Create wrapper divs
    const naturalWrapper = document.createElement('div');
    naturalWrapper.className = 'natural-keys';

    const accidentalWrapper = document.createElement('div');
    accidentalWrapper.className = 'accidental-keys';

    const totalNaturals = naturals.length;
    
    // 1. Render Natural Keys
    // Slope: C5 (360px) to C8 (240px) over 22 keys
    naturals.forEach((n, i) => {
        const keyEl = document.createElement('div');
        keyEl.className = 'key natural';
        keyEl.setAttribute('data-note', n.note);
        keyEl.setAttribute('data-freq', n.freq);
        if (n.trigger) {
            keyEl.setAttribute('data-trigger', n.trigger);
        }

        // Interpolated height (gentle slope)
        const height = 360 - i * (120 / (totalNaturals - 1));
        keyEl.style.height = `${Math.round(height)}px`;

        // Inner structures (screws, label, hint)
        keyEl.innerHTML = `
            <div class="screw screw-top"></div>
            <div class="note-name">${n.note}</div>
            ${n.trigger ? `<div class="key-hint">${n.trigger}</div>` : ''}
            <div class="screw screw-bottom"></div>
        `;
        naturalWrapper.appendChild(keyEl);
    });

    // 2. Render Accidental Keys
    // Positioning centered over gap: left = (i + 1) * (100 / 22)% - 1.6%
    // Height: 76% of average height of its neighboring natural keys
    accidentals.forEach(n => {
        const baseNote = n.note.replace('#', '');
        const leftNatIndex = naturals.findIndex(nat => nat.note === baseNote);
        
        if (leftNatIndex > -1) {
            const leftNatHeight = 360 - leftNatIndex * (120 / (totalNaturals - 1));
            const rightNatHeight = 360 - (leftNatIndex + 1) * (120 / (totalNaturals - 1));
            const avgNatHeight = (leftNatHeight + rightNatHeight) / 2;
            const accidentalHeight = avgNatHeight * 0.76;

            const keyEl = document.createElement('div');
            keyEl.className = 'key accidental';
            keyEl.setAttribute('data-note', n.note);
            keyEl.setAttribute('data-freq', n.freq);
            if (n.trigger) {
                keyEl.setAttribute('data-trigger', n.trigger);
            }

            keyEl.style.height = `${Math.round(accidentalHeight)}px`;
            
            // Positioning centered over gap
            const leftPos = (leftNatIndex + 1) * (100 / totalNaturals) - 1.6;
            keyEl.style.left = `${leftPos}%`;

            keyEl.innerHTML = `
                <div class="screw screw-top"></div>
                <div class="note-name">${n.note}</div>
                ${n.trigger ? `<div class="key-hint">${n.trigger}</div>` : ''}
                <div class="screw screw-bottom"></div>
            `;
            accidentalWrapper.appendChild(keyEl);
        }
    });

    container.innerHTML = '';
    container.appendChild(naturalWrapper);
    container.appendChild(accidentalWrapper);
}
