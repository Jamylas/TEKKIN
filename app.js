/**
 * Celestial Glockenspiel - Application Logic
 * Audio Engine, Interactive Keyboard, Canvas Particles, Song Lesson, and Recording.
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

// Song Data (notes and delays in seconds)
const SONGS = {
    twinkle: [
        { note: 'C5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'G5', dur: 0.5 }, { note: 'G5', dur: 0.5 },
        { note: 'A5', dur: 0.5 }, { note: 'A5', dur: 0.5 }, { note: 'G5', dur: 1.0 },
        { note: 'F5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'E5', dur: 0.5 },
        { note: 'D5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 1.0 },
        { note: 'G5', dur: 0.5 }, { note: 'G5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'F5', dur: 0.5 },
        { note: 'E5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'D5', dur: 1.0 },
        { note: 'G5', dur: 0.5 }, { note: 'G5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'F5', dur: 0.5 },
        { note: 'E5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'D5', dur: 1.0 },
        { note: 'C5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'G5', dur: 0.5 }, { note: 'G5', dur: 0.5 },
        { note: 'A5', dur: 0.5 }, { note: 'A5', dur: 0.5 }, { note: 'G5', dur: 1.0 },
        { note: 'F5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'E5', dur: 0.5 },
        { note: 'D5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 1.0 }
    ],
    sakura: [
        { note: 'A5', dur: 0.5 }, { note: 'A5', dur: 0.5 }, { note: 'B5', dur: 1.0 },
        { note: 'A5', dur: 0.5 }, { note: 'A5', dur: 0.5 }, { note: 'B5', dur: 1.0 },
        { note: 'A5', dur: 0.5 }, { note: 'B5', dur: 0.5 }, { note: 'C6', dur: 0.5 }, { note: 'B5', dur: 0.5 },
        { note: 'A5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'E5', dur: 1.0 },
        { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'E5', dur: 1.0 },
        { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'E5', dur: 1.0 },
        { note: 'A5', dur: 0.5 }, { note: 'B5', dur: 0.5 }, { note: 'C6', dur: 0.5 }, { note: 'B5', dur: 0.5 },
        { note: 'A5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'E5', dur: 1.0 },
        { note: 'A5', dur: 0.5 }, { note: 'A5', dur: 0.5 }, { note: 'B5', dur: 1.0 },
        { note: 'A5', dur: 0.5 }, { note: 'A5', dur: 0.5 }, { note: 'B5', dur: 1.0 },
        { note: 'E5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'B5', dur: 0.5 }, { note: 'A5', dur: 0.5 },
        { note: 'F5', dur: 0.5 }, { note: 'E5', dur: 1.5 }
    ],
    ode: [
        { note: 'E5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'G5', dur: 0.5 },
        { note: 'G5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'D5', dur: 0.5 },
        { note: 'C5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'E5', dur: 0.5 },
        { note: 'E5', dur: 0.75 }, { note: 'D5', dur: 0.25 }, { note: 'D5', dur: 1.0 },
        
        { note: 'E5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'G5', dur: 0.5 },
        { note: 'G5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'D5', dur: 0.5 },
        { note: 'C5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'E5', dur: 0.5 },
        { note: 'D5', dur: 0.75 }, { note: 'C5', dur: 0.25 }, { note: 'C5', dur: 1.0 }
    ],
    furusato: [
        { note: 'C5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 0.5 },
        { note: 'E5', dur: 1.0 }, { note: 'E5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'F5', dur: 0.5 },
        { note: 'D5', dur: 0.5 }, { note: 'E5', dur: 0.5 }, { note: 'F5', dur: 0.5 }, { note: 'G5', dur: 1.5 },
        
        { note: 'G5', dur: 0.5 }, { note: 'A5', dur: 0.5 }, { note: 'G5', dur: 0.5 }, { note: 'F5', dur: 0.5 },
        { note: 'E5', dur: 1.0 }, { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 0.5 }, { note: 'D5', dur: 0.5 },
        { note: 'E5', dur: 0.5 }, { note: 'D5', dur: 0.5 }, { note: 'C5', dur: 1.5 }
    ]
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

// Recording state
let isRecording = false;
let recordStartTime = 0;
let recordedNotes = [];
let isPlayingRecording = false;
let playbackTimeouts = [];

// Lesson State
let isLessonActive = false;
let currentSongKey = 'none';
let currentLessonIndex = 0;
let lessonNotes = []; // Instantiated notes for rendering
let score = 0;

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
let fallingCanvas, fallingCtx;
let visualizerCanvas, visualizerCtx;

let particles = [];
let activeKeyGlows = {}; // map of noteName -> intensity

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
    setupEventListeners();
    animate();
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
    fallingCanvas = document.getElementById('fallingNotesCanvas');
    fallingCtx = fallingCanvas.getContext('2d');
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
    
    // Resize Falling Notes Canvas
    const fallContainer = document.querySelector('.falling-notes-container');
    fallingCanvas.width = fallContainer.clientWidth;
    fallingCanvas.height = fallContainer.clientHeight;

    // Resize Visualizer
    const visContainer = document.querySelector('.visualizer-container');
    visualizerCanvas.width = visContainer.clientWidth;
    visualizerCanvas.height = visContainer.clientHeight;
}

// Background Twinkling Stars
function initStars() {
    const bg = document.getElementById('starsBackground');
    const starCount = 60;
    for (let i = 0; i < starCount; i++) {
        const star = document.createElement('div');
        star.className = 'star';
        const size = Math.random() * 2.5 + 0.5;
        star.style.width = `${size}px`;
        star.style.height = `${size}px`;
        star.style.left = `${Math.random() * 100}%`;
        star.style.top = `${Math.random() * 100}%`;
        star.style.setProperty('--duration', `${Math.random() * 3 + 2}s`);
        star.style.setProperty('--opacity', Math.random() * 0.7 + 0.3);
        bg.appendChild(star);
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
    const pCount = Math.floor(Math.random() * 12) + 8;
    for (let i = 0; i < pCount; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 3 + 1;
        particles.push({
            x: x,
            y: y,
            vx: Math.cos(angle) * speed,
            vy: Math.sin(angle) * speed - (Math.random() * 2 + 1), // floating upward trend
            size: Math.random() * 6 + 3,
            color: noteColor,
            alpha: 1.0,
            decay: Math.random() * 0.02 + 0.015,
            rotation: Math.random() * Math.PI,
            rotSpeed: (Math.random() - 0.5) * 0.1
        });
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
        p.vy += 0.04; // gravity
        p.alpha -= p.decay;
        p.rotation += p.rotSpeed;
        
        if (p.alpha <= 0) {
            particles.splice(i, 1);
            continue;
        }

        effectsCtx.save();
        effectsCtx.translate(p.x, p.y);
        effectsCtx.rotate(p.rotation);
        effectsCtx.globalAlpha = p.alpha;
        effectsCtx.fillStyle = p.color;
        effectsCtx.shadowBlur = 10;
        effectsCtx.shadowColor = p.color;

        // Draw star shapes
        effectsCtx.beginPath();
        for (let j = 0; j < 5; j++) {
            effectsCtx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * p.size, Math.sin((18 + j * 72) * Math.PI / 180) * p.size);
            effectsCtx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * (p.size/2), Math.sin((54 + j * 72) * Math.PI / 180) * (p.size/2));
        }
        effectsCtx.closePath();
        effectsCtx.fill();
        effectsCtx.restore();
    }

    // 2. Falling Notes Canvas Animation (Lesson)
    animateFallingNotes();

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

    // Handle recording
    if (isRecording) {
        recordedNotes.push({
            note: noteName,
            time: Date.now() - recordStartTime
        });
        document.getElementById('recordStatus').textContent = `録音中... (${recordedNotes.length} 音)`;
    }

    // Handle Lesson guided check
    if (isLessonActive && lessonNotes.length > 0) {
        const currentTarget = lessonNotes[currentLessonIndex];
        if (currentTarget && currentTarget.note === noteName && !currentTarget.hit) {
            currentTarget.hit = true;
            score++;
            
            // Advance lesson note
            currentLessonIndex++;
            
            if (currentLessonIndex >= lessonNotes.length) {
                // Completed song!
                document.getElementById('lessonStatus').textContent = `素晴らしい！完奏しました！ スコア: ${score}/${lessonNotes.length}`;
                document.getElementById('lessonStatus').classList.remove('active');
                setTimeout(() => {
                    stopLesson();
                }, 2000);
            } else {
                document.getElementById('lessonStatus').textContent = `いい調子！次の音：${lessonNotes[currentLessonIndex].note}`;
            }
        }
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
    document.addEventListener('mousemove', (e) => {
        if (isTouchDevice || !customMallet) return;
        
        // Check if mouse is hovering over the instrument container
        const isOverInstrument = e.target.closest('.instrument-container') !== null;
        
        if (isOverInstrument) {
            customMallet.style.display = 'block';
            customMallet.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        } else {
            customMallet.style.display = 'none';
        }
    });

    document.addEventListener('mousedown', (e) => {
        if (!isTouchDevice && customMallet && e.target.closest('.instrument-container')) {
            customMallet.classList.add('striking');
        }
    });

    document.addEventListener('mouseup', () => {
        if (customMallet) {
            customMallet.classList.remove('striking');
        }
    });

    // Touch device detection to hide mallet
    document.addEventListener('touchstart', () => {
        isTouchDevice = true;
        if (customMallet) {
            customMallet.style.display = 'none';
        }
    }, { passive: true });

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

    // Song Selection
    const songSelect = document.getElementById('songSelect');
    const startLessonBtn = document.getElementById('startLessonBtn');
    const stopLessonBtn = document.getElementById('stopLessonBtn');

    songSelect.addEventListener('change', () => {
        currentSongKey = songSelect.value;
        if (currentSongKey === 'none') {
            startLessonBtn.disabled = true;
            stopLessonBtn.disabled = true;
            stopLesson();
        } else {
            startLessonBtn.disabled = false;
            stopLessonBtn.disabled = true;
        }
    });

    // Lesson Buttons
    startLessonBtn.addEventListener('click', startLesson);
    stopLessonBtn.addEventListener('click', stopLesson);

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

// --- SONG LESSON / PLAY-ALONG ENGINE ---

function startLesson() {
    if (currentSongKey === 'none') return;
    
    if (!audioCtx) initAudio();
    
    isLessonActive = true;
    currentLessonIndex = 0;
    score = 0;
    
    document.getElementById('startLessonBtn').disabled = true;
    document.getElementById('stopLessonBtn').disabled = false;
    document.getElementById('songSelect').disabled = true;
    document.getElementById('lessonStatus').classList.add('active');
    
    // Parse selected song into falling notes queue
    const songData = SONGS[currentSongKey];
    lessonNotes = [];
    
    let accTime = 0.5; // Start padding delay
    songData.forEach((noteObj, idx) => {
        lessonNotes.push({
            note: noteObj.note,
            time: accTime,     // Time when the note reaches target bar
            dur: noteObj.dur,
            hit: false,
            y: -100 - (accTime * 150), // Map time back to start Y coordinate
            x: 0 // Will be computed relative to key elements
        });
        accTime += noteObj.dur * 1.5; // Scale speed of song slightly
    });

    document.getElementById('lessonStatus').textContent = `レッスン開始！最初の音：${lessonNotes[0].note}`;
}

function stopLesson() {
    isLessonActive = false;
    lessonNotes = [];
    document.getElementById('startLessonBtn').disabled = false;
    document.getElementById('stopLessonBtn').disabled = true;
    document.getElementById('songSelect').disabled = false;
    document.getElementById('lessonStatus').textContent = '練習したい曲を選択し、「練習スタート」を押してください。';
    document.getElementById('lessonStatus').classList.remove('active');
}

// Animate falling elements on the Falling Canvas
function animateFallingNotes() {
    fallingCtx.clearRect(0, 0, fallingCanvas.width, fallingCanvas.height);
    
    if (!isLessonActive || lessonNotes.length === 0) return;

    const frameRect = document.querySelector('.glockenspiel-frame').getBoundingClientRect();
    const fallRect = fallingCanvas.getBoundingClientRect();
    const targetY = fallingCanvas.height - 15; // Hit target line near bottom
    
    // Draw target line helper
    fallingCtx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
    fallingCtx.setLineDash([5, 5]);
    fallingCtx.lineWidth = 1;
    fallingCtx.beginPath();
    fallingCtx.moveTo(0, targetY);
    fallingCtx.lineTo(fallingCanvas.width, targetY);
    fallingCtx.stroke();
    fallingCtx.setLineDash([]); // reset

    // Get key positions dynamicly
    lessonNotes.forEach((n, idx) => {
        // Dynamic lookup X position of corresponding physical key
        const keyEl = document.querySelector(`.key[data-note="${n.note}"]`);
        if (keyEl) {
            const keyRect = keyEl.getBoundingClientRect();
            n.x = (keyRect.left - fallRect.left) + keyRect.width / 2;
        }
    });

    // Check if the current note is waiting to be played
    const currentTarget = lessonNotes[currentLessonIndex];
    let speed = 2.2; // Pixels per frame note descent

    // Update note coordinates
    lessonNotes.forEach((n, idx) => {
        if (n.hit) {
            n.y += speed * 2; // fall quickly off-screen if already hit
            return;
        }

        // Guided mode: if this note is the current active target,
        // freeze it at the target line until the user hits it.
        if (idx === currentLessonIndex) {
            if (n.y < targetY) {
                n.y += speed;
            } else {
                n.y = targetY; // Lock at target line
                
                // Pulsate target glow ring on canvas
                const pulseSize = 15 + Math.sin(Date.now() * 0.008) * 5;
                const isAcc = n.note.includes('#');
                fallingCtx.strokeStyle = isAcc ? 'rgba(255, 0, 127, 0.8)' : 'rgba(0, 240, 255, 0.8)';
                fallingCtx.lineWidth = 3;
                fallingCtx.beginPath();
                fallingCtx.arc(n.x, targetY, pulseSize, 0, Math.PI * 2);
                fallingCtx.stroke();

                // Make the physical key glow as an helper hint
                const keyEl = document.querySelector(`.key[data-note="${n.note}"]`);
                if (keyEl) {
                    keyEl.classList.add('guided-hint');
                }
            }
        } else {
            // Other notes descend normally
            // If it is before currentLessonIndex (missed/ignored), let it fall off
            n.y += speed;
        }
    });

    // Draw notes on canvas
    lessonNotes.forEach((n, idx) => {
        // Skip drawing if way off screen
        if (n.y > fallingCanvas.height + 30 || n.y < -50) return;

        const isAcc = n.note.includes('#');
        const color = isAcc ? '#ff007f' : '#00f0ff';
        const shadow = isAcc ? 'rgba(255,0,127,0.8)' : 'rgba(0,240,255,0.8)';

        // Draw note shape (star with tail or glowing orb)
        fallingCtx.save();
        fallingCtx.translate(n.x, n.y);
        
        // Glow effect
        fallingCtx.shadowBlur = 15;
        fallingCtx.shadowColor = shadow;
        fallingCtx.fillStyle = color;

        if (idx === currentLessonIndex) {
            // The active target is a pulsing star
            const scale = 1 + Math.sin(Date.now() * 0.01) * 0.15;
            fallingCtx.scale(scale, scale);
        }

        // Draw cute star shape
        fallingCtx.beginPath();
        const size = isAcc ? 10 : 12;
        for (let j = 0; j < 5; j++) {
            fallingCtx.lineTo(Math.cos((18 + j * 72) * Math.PI / 180) * size, Math.sin((18 + j * 72) * Math.PI / 180) * size);
            fallingCtx.lineTo(Math.cos((54 + j * 72) * Math.PI / 180) * (size/2), Math.sin((54 + j * 72) * Math.PI / 180) * (size/2));
        }
        fallingCtx.closePath();
        fallingCtx.fill();

        // Draw note letter on the star
        if (isLabelsVisible) {
            fallingCtx.fillStyle = '#070714';
            fallingCtx.shadowBlur = 0;
            fallingCtx.font = 'bold 8px Outfit';
            fallingCtx.textAlign = 'center';
            fallingCtx.textBaseline = 'middle';
            // Show only note letter like C, D, F# (omit octave 5/6)
            const noteText = n.note.replace(/\d/, '');
            fallingCtx.fillText(noteText, 0, 0);
        }

        fallingCtx.restore();
    });

    // Clean up hint highlight from keys that are no longer active target
    document.querySelectorAll('.key').forEach(k => {
        const note = k.getAttribute('data-note');
        if (!currentTarget || currentTarget.note !== note) {
            k.classList.remove('guided-hint');
        }
    });
}
