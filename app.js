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
let isManuallySwitchingMode = false;

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
let visualizerCanvas, visualizerCtx;

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
    initCanvases();
    renderKeyboard();
    setupEventListeners();
    animate();

    // Initialize multiplayer based on URL hash
    const hash = window.location.hash;
    if (hash && hash.startsWith('#TEKKIN-')) {
        roomId = hash.substring(1); // remove '#'
        isHost = false;
        
        if (roomId === 'TEKKIN-GRAND-ARENA-JAMYLAS-V2' || roomId === 'TEKKIN-GRAND-ARENA-JAMYLAS') {
            multiplayerMode = 'grand';
            if (roomId === 'TEKKIN-GRAND-ARENA-JAMYLAS') {
                roomId = 'TEKKIN-GRAND-ARENA-JAMYLAS-V2';
                window.location.hash = roomId;
            }
        } else if ((roomId.startsWith('TEKKIN-BAND-JAMYLAS-V2-') || roomId.startsWith('TEKKIN-BAND-JAMYLAS-')) && !roomId.startsWith('TEKKIN-BAND-TEMP-')) {
            multiplayerMode = 'quick';
            const match = roomId.match(/TEKKIN-BAND-(?:JAMYLAS-V2-|JAMYLAS-)(\d+)/);
            if (match) {
                currentQuickMatchIndex = parseInt(match[1]);
            }
            if (roomId.startsWith('TEKKIN-BAND-JAMYLAS-') && !roomId.startsWith('TEKKIN-BAND-JAMYLAS-V2-')) {
                roomId = `TEKKIN-BAND-JAMYLAS-V2-${currentQuickMatchIndex}`;
                window.location.hash = roomId;
            }
        } else {
            multiplayerMode = 'private';
        }
        
        updateModeIndicator();
        initMultiplayer(roomId);
    } else {
        // Default to Grand Arena!
        multiplayerMode = 'grand';
        isHost = true; // Host first, falls back to guest if taken on server
        roomId = 'TEKKIN-GRAND-ARENA-JAMYLAS-V2';
        window.location.hash = roomId;
        updateModeIndicator();
        initMultiplayer(roomId);
    }
});

// リロード時・ページ離脱時のゾンビピア防止クリーンアップ
window.addEventListener('beforeunload', () => {
    if (peer) {
        try {
            peer.destroy();
        } catch (e) {
            console.error(e);
        }
    }
});

function updateMalletHeadStyle() {
    if (malletHead) {
        malletHead.className = `mallet-head ${currentMallet}`;
    }
}

// Canvas Setup
function initCanvases() {
    visualizerCanvas = document.getElementById('visualizerCanvas');
    visualizerCtx = visualizerCanvas.getContext('2d');

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
}

function resizeCanvases() {
    // Resize Visualizer
    const visContainer = document.querySelector('.visualizer-container');
    visualizerCanvas.width = visContainer.clientWidth;
    visualizerCanvas.height = visContainer.clientHeight;
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

// Animate visual elements
function animate() {
    // Audio Visualizer Canvas
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
    isManuallySwitchingMode = false; // Reset flag
    updateStatusUI('connecting', '接続サーバーにログイン中...');

    // P2P connections are arbitrated by the PeerJS cloud signaling server
    localPeerId = isHost ? id : `GUEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    const currentPeer = new Peer(localPeerId, {
        debug: 1 // Print warnings and errors only
    });
    peer = currentPeer;

    // 接続タイムアウト処理（シグナリングサーバーから応答がない場合）
    let loginTimeout = setTimeout(() => {
        if (peer === currentPeer && !currentPeer.open) {
            updateStatusUI('disconnected', '接続タイムアウト (広告ブロックや回線制限の可能性があります)');
            try {
                currentPeer.destroy();
            } catch (e) {
                console.error(e);
            }
            if (peer === currentPeer) {
                peer = null;
            }
        }
    }, 8000);

    currentPeer.on('open', () => {
        if (peer !== currentPeer) return;
        clearTimeout(loginTimeout);
        console.log('PeerJS server connection open. My Peer ID:', localPeerId);
        setupShareUI();
        
        if (isHost) {
            updateStatusUI('connected', 'ホストとして待機中');
            // Host waits for guests to connect
            currentPeer.on('connection', (conn) => {
                if (peer !== currentPeer) return;
                handleIncomingConnection(conn, currentPeer);
            });
        } else {
            updateStatusUI('connecting', 'ホストに接続中...');
            // Guest connects to Host
            const conn = currentPeer.connect(id);
            
            // ゾンビホスト対策として接続タイムアウト（7秒）を設定
            const connectTimeout = setTimeout(() => {
                if (peer !== currentPeer) return;
                if (conn && !conn.open) {
                    console.warn(`Connection to host ${id} timed out. Host might be a zombie peer.`);
                    conn.close();
                    
                    try {
                        currentPeer.destroy();
                    } catch (e) {
                        console.error(e);
                    }
                    if (peer === currentPeer) {
                        peer = null;
                    }
                    
                    if (isSearchingQuickMatch) {
                        console.log(`Band ${currentQuickMatchIndex} host timed out. Hosting this band!`);
                        isSearchingQuickMatch = false;
                        isHost = true;
                        updateModeIndicator();
                        setTimeout(() => {
                            initMultiplayer(roomId);
                        }, 1000);
                    } else {
                        console.log('Host timed out. Hosting the current room ID...');
                        isHost = true;
                        updateModeIndicator();
                        setTimeout(() => {
                            initMultiplayer(roomId);
                        }, 1000);
                    }
                }
            }, 7000);

            handleOutgoingConnection(conn, currentPeer, connectTimeout);
        }
    });

    currentPeer.on('error', (err) => {
        if (peer !== currentPeer) return;
        clearTimeout(loginTimeout);
        console.error('PeerJS error:', err);
        updateStatusUI('disconnected', `接続エラー (${err.type})`);
        
        if (err.type === 'unavailable-id' || err.type === 'id-taken-on-server') {
            console.warn('Room ID is taken on server. Connecting as guest instead...');
            try {
                currentPeer.destroy();
            } catch(e) {
                console.error(e);
            }
            if (peer === currentPeer) {
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
            try {
                currentPeer.destroy();
            } catch(e) {
                console.error(e);
            }
            if (peer === currentPeer) {
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

function handleIncomingConnection(conn, currentPeer) {
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
        if (peer !== currentPeer) return;
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
        if (peer !== currentPeer) return;
        handleDataMessage(data, conn.peer);
    });

    conn.on('close', () => {
        if (peer !== currentPeer) return;
        console.log('Guest disconnected:', conn.peer);
        removeConnection(conn);
    });
    
    conn.on('error', () => {
        if (peer !== currentPeer) return;
        removeConnection(conn);
    });
}

function handleOutgoingConnection(conn, currentPeer, connectTimeout) {
    conn.on('open', () => {
        if (peer !== currentPeer) return;
        if (connectTimeout) clearTimeout(connectTimeout);
        console.log('Connected to Host!');
        connections.push(conn);
        updateStatusUI('connected', `セッション接続中`);
        
        if (isSearchingQuickMatch) {
            isSearchingQuickMatch = false;
            updateModeIndicator();
        }
    });

    conn.on('data', (data) => {
        if (peer !== currentPeer) return;
        handleDataMessage(data, conn.peer);
    });

    conn.on('close', () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        if (peer !== currentPeer) return;
        console.log('Host disconnected.');
        updateStatusUI('disconnected', '接続が切断されました');
        removeConnection(conn);
        
        if (isManuallySwitchingMode) return; // Skip failover during mode switch
        
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
    
    conn.on('error', () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        if (peer !== currentPeer) return;
        removeConnection(conn);
    });
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
        updatePeerCountUI();
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
    const keyEl = document.querySelector(`.key[data-note="${note}"]`);
    if (keyEl) {
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 100);
        
        const freq = parseFloat(keyEl.getAttribute('data-freq'));
        playNoteAudio(freq, relativeY);
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
    
    if (connections.length === 0) {
        if (isHost) {
            updateStatusUI('connected', 'ホストとして待機中');
        } else {
            updateStatusUI('disconnected', '接続が切断されました');
            allGuests = [];
        }
    }
    updatePeerCountUI();
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
        updatePeerCountUI();
        
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
        updatePeerCountUI();
        
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
    isSearchingQuickMatch = false; // Cancel ongoing quick match search
    isManuallySwitchingMode = true; // Mark as manual switch to suppress failover logs
    
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
    allGuests = [];
    updatePeerCountUI();

    if (mode === 'grand') {
        isHost = true; // Host first, falls back to guest if taken on server
        roomId = 'TEKKIN-GRAND-ARENA-JAMYLAS-V2';
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
    roomId = `TEKKIN-BAND-JAMYLAS-V2-${currentQuickMatchIndex}`;
    window.location.hash = roomId;
    isHost = true; // Host first to quickly check ownership
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
    updatePeerCountUI();
}

function updatePeerCountUI() {
    const label = document.getElementById('peerCountLabel');
    if (!label) return;

    if (peer && (peer.open || connections.length > 0)) {
        let count = 1;
        if (isHost) {
            count = connections.length + 1;
        } else {
            if (connections.length > 0) {
                count = Math.max(connections.length + 1, allGuests.length + 1);
            } else {
                count = 1;
            }
        }
        label.style.display = 'inline';
        label.textContent = `(接続人数: ${count}人)`;
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
