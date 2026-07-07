/**
 * TEKKIN - メトロノームエンジンモジュール
 * 
 * 正確な Web Audio API の時間軸に基づき、バックグラウンドでの拍子カウント、
 * クリック音のスケジューリング、およびUI（LEDフラッシュ）との同期制御を行います。
 */

import { state } from './state.js';
import { initAudio } from './audio.js';

/**
 * 定期的に呼び出され、先読み時間（scheduleAheadTime）の範囲内にある拍を検出し、
 * 順次スケジューリングを行います。
 */
function metronomeScheduler() {
    while (state.nextNoteTime < state.audioCtx.currentTime + state.scheduleAheadTime) {
        scheduleBeat(state.currentBeat, state.nextNoteTime);
        advanceBeat();
    }
}

/**
 * メトロノームの拍カウントを1歩進め、次の拍の再生予定時間を計算します。
 */
function advanceBeat() {
    const secondsPerBeat = 60.0 / state.bpm;
    state.nextNoteTime += secondsPerBeat;
    state.currentBeat = (state.currentBeat + 1) % state.beatsPerBar;
}

/**
 * 指定された時間の拍（クリック音）をスケジューリングして鳴らします。
 * 小節の最初の拍（beatNumber === 0）はアクセント音になります。
 * 
 * @param {number} beatNumber 現在の拍番号 (0 〜 拍子数-1)
 * @param {number} time 音を鳴らす正確なオーディオタイムスタンプ (秒)
 */
function scheduleBeat(beatNumber, time) {
    if (!state.audioCtx) return;

    const osc = state.audioCtx.createOscillator();
    const gainNode = state.audioCtx.createGain();

    osc.type = 'sine';
    const isAccent = beatNumber === 0;
    // 最初の拍（ダウンビート）は高音 (1200Hz) のウッドブロック風、他は低音 (800Hz) に設定
    osc.frequency.setValueAtTime(isAccent ? 1200 : 800, time);

    gainNode.gain.setValueAtTime(0, time);
    gainNode.gain.linearRampToValueAtTime(0.2, time + 0.002);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);

    osc.connect(gainNode);
    // ビジュアライザー（オシロスコープ）にも波形が出るよう、アナライザーに接続
    gainNode.connect(state.analyser); 

    osc.start(time);
    osc.stop(time + 0.05);

    // 音の発生タイミングに合わせてLEDの光を遅延実行（画面描画時間と同期）
    const delayMs = (time - state.audioCtx.currentTime) * 1000;
    setTimeout(() => {
        triggerMetronomeLedFlash(isAccent);
    }, Math.max(0, delayMs));
}

/**
 * メトロノームLED要素を光らせます（点滅アニメーション用のクラスを追加・削除）。
 * 
 * @param {boolean} isAccent 強拍（アクセント）かどうか
 */
function triggerMetronomeLedFlash(isAccent) {
    const led = document.getElementById('metronomeLed');
    if (!led) return;

    const flashClass = isAccent ? 'flash-accent' : 'flash-normal';
    led.classList.add(flashClass);

    setTimeout(() => {
        led.classList.remove('flash-accent', 'flash-normal');
    }, 100);
}

/**
 * メトロノームの再生/一時停止を切り替えます。
 */
export function toggleMetronome() {
    if (!state.audioCtx) initAudio();
    if (state.audioCtx.state === 'suspended') state.audioCtx.resume();

    const btn = document.getElementById('metronomeToggleBtn');

    if (!state.isPlayingMetronome) {
        state.isPlayingMetronome = true;
        state.currentBeat = 0;
        state.nextNoteTime = state.audioCtx.currentTime + 0.05;
        // 定期的にスケジューラを監視するタイマーを始動 (lookahead ms毎)
        state.metronomeTimer = setInterval(metronomeScheduler, state.lookahead);
        
        btn.classList.add('btn-primary');
        btn.classList.remove('btn-secondary');
        btn.innerHTML = '<span class="btn-icon">■</span>ストップ';
    } else {
        state.isPlayingMetronome = false;
        clearInterval(state.metronomeTimer);
        state.metronomeTimer = null;
        
        btn.classList.remove('btn-primary');
        btn.classList.add('btn-secondary');
        btn.innerHTML = '<span class="btn-icon">▶</span>スタート';
    }
}
