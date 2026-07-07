/**
 * TEKKIN - オーディオエンジンモジュール
 * 
 * Web Audio API を使用して、物理モデリングによる鉄琴音の合成、
 * リバーブやディレイなどの空間系エフェクトの処理を行います。
 */

import { state } from './state.js';

/**
 * オーディオコンテキストおよび各エフェクトノードを初期化します。
 * ユーザーの初回の操作（クリック等）に合わせて呼び出されます。
 */
export function initAudio() {
    if (state.audioCtx) return;

    // ブラウザ互換性を考慮した AudioContext の作成
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    state.audioCtx = new AudioContextClass();

    // 1. アナライザーノード（ビジュアライザー用）
    state.analyser = state.audioCtx.createAnalyser();
    state.analyser.fftSize = 256;

    // 2. ディレイネットワーク
    state.delayNode = state.audioCtx.createDelay(2.0);
    state.delayFeedback = state.audioCtx.createGain();
    state.delayMix = state.audioCtx.createGain();
    
    // スライダーの値からディレイ初期値を設定
    state.delayNode.delayTime.value = parseFloat(document.getElementById('delayTimeSlider').value) / 100;
    state.delayFeedback.gain.value = parseFloat(document.getElementById('delayFeedbackSlider').value) / 100;
    state.delayMix.gain.value = parseFloat(document.getElementById('delayTimeSlider').value) > 0 ? 0.2 : 0;

    // ディレイループの接続 (Delay -> Feedback -> Delay)
    state.delayNode.connect(state.delayFeedback);
    state.delayFeedback.connect(state.delayNode);

    // 3. リバーブネットワーク (合成インパルス応答)
    state.reverbConvolver = state.audioCtx.createConvolver();
    state.reverbConvolver.buffer = createReverbBuffer(3.0, 2.5); // 残響時間3秒、減衰時定数2.5秒
    state.reverbMix = state.audioCtx.createGain();
    
    const reverbVal = parseFloat(document.getElementById('reverbSlider').value) / 100;
    state.reverbMix.gain.value = reverbVal * 0.45; // 最大リバーブゲイン

    // 4. マスターボリュームゲイン
    state.masterGain = state.audioCtx.createGain();
    const volumeVal = parseFloat(document.getElementById('volumeSlider').value) / 100;
    state.masterGain.gain.value = volumeVal;

    // ノード間接続:
    // Source -> Analyser
    // Analyser -> Dry(原音) -> MasterGain
    // Analyser -> DelayNode -> delayMix -> MasterGain
    // Analyser -> ReverbConvolver -> reverbMix -> MasterGain
    // MasterGain -> Destination (スピーカー)

    // 原音ルート
    state.analyser.connect(state.masterGain);

    // ディレイルート
    state.analyser.connect(state.delayNode);
    state.delayMix.gain.value = 0.25; // ディレイの送出ミックス比
    state.delayNode.connect(state.delayMix);
    state.delayMix.connect(state.masterGain);

    // リバーブルート
    state.analyser.connect(state.reverbConvolver);
    state.reverbConvolver.connect(state.reverbMix);
    state.reverbMix.connect(state.masterGain);

    // 最終出力
    state.masterGain.connect(state.audioCtx.destination);

    // 初期エフェクトパラメータの適用
    updateEffects();
}

/**
 * リバーブエフェクト用の擬似的なインパルス応答（ホワイトノイズの指数減衰）バッファを生成します。
 * 
 * @param {number} duration 残響時間（秒）
 * @param {number} decay 減衰率（時定数）
 * @returns {AudioBuffer} 生成されたインパルス応答オーディオバッファ
 */
export function createReverbBuffer(duration, decay) {
    const sampleRate = state.audioCtx ? state.audioCtx.sampleRate : 44100;
    const length = sampleRate * duration;
    
    // ステレオ用のバッファを作成
    const impulse = (state.audioCtx || new (window.AudioContext || window.webkitAudioContext)()).createBuffer(2, length, sampleRate);
    const left = impulse.getChannelData(0);
    const right = impulse.getChannelData(1);

    for (let i = 0; i < length; i++) {
        const percent = i / length;
        const decayFactor = Math.exp(-percent * decay);
        // 左右のチャンネルで異なる乱数種を使ってステレオ感（非相関）を演出
        left[i] = (Math.random() * 2 - 1) * decayFactor;
        right[i] = (Math.random() * 2 - 1) * decayFactor;
    }
    return impulse;
}

/**
 * UIのスライダー値に基づいて、エフェクトパラメータ（ボリューム、ディレイ、リバーブ）をリアルタイムに更新します。
 */
export function updateEffects() {
    if (!state.audioCtx) return;

    // リバーブの更新
    const reverbSlider = document.getElementById('reverbSlider');
    const reverbVal = parseFloat(reverbSlider.value) / 100;
    state.reverbMix.gain.setTargetAtTime(reverbVal * 0.45, state.audioCtx.currentTime, 0.05);
    document.getElementById('reverbValue').textContent = `${reverbSlider.value}%`;

    // ディレイ時間の更新 (最大1.0秒)
    const delayTimeSlider = document.getElementById('delayTimeSlider');
    const delayTimeVal = parseFloat(delayTimeSlider.value) / 100;
    state.delayNode.delayTime.setTargetAtTime(delayTimeVal, state.audioCtx.currentTime, 0.1);
    document.getElementById('delayTimeValue').textContent = `${delayTimeVal.toFixed(1)}s`;

    // ディレイフィードバック量の更新
    const delayFeedbackSlider = document.getElementById('delayFeedbackSlider');
    const delayFeedbackVal = parseFloat(delayFeedbackSlider.value) / 100;
    state.delayFeedback.gain.setTargetAtTime(delayFeedbackVal, state.audioCtx.currentTime, 0.05);
    document.getElementById('delayFeedbackValue').textContent = `${delayFeedbackSlider.value}%`;

    // マスターボリュームの更新
    const volumeSlider = document.getElementById('volumeSlider');
    const volumeVal = parseFloat(volumeSlider.value) / 100;
    state.masterGain.gain.setTargetAtTime(volumeVal, state.audioCtx.currentTime, 0.05);
    document.getElementById('volumeValue').textContent = `${volumeSlider.value}%`;
}

/**
 * 物理モデリング音響アルゴリズムに基づき、指定の周波数で鉄琴の音を合成して再生します。
 * 打鍵する位置（縦方向）によって音量や減衰、倍音構成がリアルタイムに変化します。
 * 
 * @param {number} freq 再生する基本周波数 (Hz)
 * @param {number} [relativeY=0.5] 打鍵位置の相対座標（0.0: 上端、1.0: 下端）。ネジ付近(0.224, 0.776)は消音されます。
 */
export function playNoteAudio(freq, relativeY = 0.5) {
    if (!state.audioCtx) return;
    
    // ブラウザのセキュリティ制約によりサスペンドされている場合は再開
    if (state.audioCtx.state === 'suspended') {
        state.audioCtx.resume();
    }

    const now = state.audioCtx.currentTime;

    // --- 物理ベースの励起モデル (Physics-Based Excitation Modeling) ---
    // relativeY は音板の上端(0.0)〜下端(1.0)を表す。
    // 音板が固定されているネジの位置（振動の節）は 0.224 および 0.776 付近。
    const distToNode = Math.min(Math.abs(relativeY - 0.224), Math.abs(relativeY - 0.776));
    const distToCenter = Math.abs(relativeY - 0.5);

    // 1. ダンピング要因: ネジの近く（節）を叩くと振動が抑えられ、減衰が極めて早くなる
    const damping = distToNode < 0.08 ? 0.35 + 0.65 * (distToNode / 0.08) : 1.0;

    // 2. 基音の励起: 音板の中央(0.5)で最も強く、ネジ付近（節）ではほとんど励起されない
    const nodeGate = distToNode < 0.12 ? 0.2 + 0.8 * (distToNode / 0.12) : 1.0;
    const fundamentalExcitation = (0.3 + 0.7 * Math.sin(relativeY * Math.PI)) * nodeGate;

    // 3. 高次倍音の励起: 端（0.0 または 1.0）を叩くと、高音の非調和倍音が強く引き出される
    // マレットが当たる瞬間のアタックノイズ（クリック）も端に近いほど鋭くなる
    const clickVolumeScale = 0.5 + distToCenter * 1.2; 
    const overtoneScale = 0.6 + distToCenter * 0.9;

    // マレット（バチ）の材質ごとのデフォルト音色パラメータ
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

    if (state.currentMallet === 'brass') { 
        // 真鍮製マレット: 硬く、アタックが鋭く、金属的に長く響く
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
    } else if (state.currentMallet === 'rubber') { 
        // ゴム製マレット: 柔らかく、アタックが丸く、中低域が温かく響き、倍音は少ない
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

    // 物理シミュレーションによるダンピング（減衰）の適用
    fundamentalDecay *= damping;
    overtoneDecay1 *= damping;
    overtoneDecay2 *= damping;
    overtoneDecay3 *= damping;

    // 鉄琴特有の倍音構成（基音 + 3つの非調和部分音 ratios: 1.0, 2.76, 5.40, 8.93）
    const partials = [
        { ratio: 1.0, vol: fundVol * fundamentalExcitation * damping, decay: fundamentalDecay },
        { ratio: 2.76, vol: otVol1 * overtoneScale * damping, decay: overtoneDecay1 },
        { ratio: 5.40, vol: otVol2 * overtoneScale * damping, decay: overtoneDecay2 },
        { ratio: 8.93, vol: otVol3 * overtoneScale * damping, decay: overtoneDecay3 }
    ];

    // 各ノート専用のミックスバス
    const noteGain = state.audioCtx.createGain();
    noteGain.gain.setValueAtTime(1.0, now);
    noteGain.connect(state.analyser);

    // 各部分音（オシレーター）の生成と合成
    partials.forEach(p => {
        const osc = state.audioCtx.createOscillator();
        const gainNode = state.audioCtx.createGain();

        // 鉄琴の澄んだ音を表現するため正弦波（Sine Wave）を使用
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * p.ratio, now);

        gainNode.gain.setValueAtTime(0, now);
        // 極めて鋭い立ち上がり (アタック時間: 2ms)
        gainNode.gain.linearRampToValueAtTime(p.vol, now + 0.002);
        // 指数減衰によるリリース (setTargetAtTime を使用して滑らかに減衰)
        gainNode.gain.setTargetAtTime(0, now + 0.002, p.decay / 4);

        osc.connect(gainNode);
        gainNode.connect(noteGain);

        osc.start(now);
        // CPUリソース保護のため、音の減衰完了後にオシレーターを完全に停止
        osc.stop(now + p.decay * 4);
    });

    // マレットが衝突した際のアタックノイズ（三角波による高周波過渡応答）
    const clickOsc = state.audioCtx.createOscillator();
    const clickGain = state.audioCtx.createGain();
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
