/**
 * TEKKIN - 録音スタジオ（レコーダー）モジュール
 * 
 * ユーザーのリアルタイム演奏（打鍵タイミングと音名）を記録し、
 * タイミングを正確に再現して再生、クリアする機能を提供します。
 */

import { state } from './state.js';
import { initAudio } from './audio.js';
import { strikeNote } from './ui.js';

/**
 * 録音の開始と停止を切り替えます。
 * 開始時には以前のデータをクリアし、ミリ秒単位でタイマーを計時します。
 */
export function toggleRecording() {
    if (!state.audioCtx) initAudio();

    const recordBtn = document.getElementById('recordBtn');
    const playRecordBtn = document.getElementById('playRecordBtn');
    const clearRecordBtn = document.getElementById('clearRecordBtn');

    if (!state.isRecording) {
        // 録音開始
        state.isRecording = true;
        state.recordedNotes = [];
        state.recordStartTime = Date.now();
        recordBtn.classList.add('recording');
        recordBtn.innerHTML = '<span class="record-dot"></span> 録音中...';
        document.getElementById('recordStatus').textContent = '演奏を録音中。鍵盤を押してください...';
        document.getElementById('recordStatus').classList.add('active');

        // 録音中は再生およびクリア操作を無効化
        playRecordBtn.disabled = true;
        clearRecordBtn.disabled = true;
    } else {
        // 録音停止
        state.isRecording = false;
        recordBtn.classList.remove('recording');
        recordBtn.innerHTML = '<span class="record-dot"></span> 録音';
        document.getElementById('recordStatus').classList.remove('active');

        if (state.recordedNotes.length > 0) {
            document.getElementById('recordStatus').textContent = `録音完了: ${state.recordedNotes.length} 音`;
            playRecordBtn.disabled = false;
            clearRecordBtn.disabled = false;
        } else {
            document.getElementById('recordStatus').textContent = '音符が記録されませんでした。';
            playRecordBtn.disabled = true;
            clearRecordBtn.disabled = true;
        }
    }
}

/**
 * 記録された音符の配列をスキャンし、各音の相対時間（タイムスタンプ）に基づいて
 * `setTimeout` で再生をスケジューリングします。
 */
export function playRecordedSequence() {
    if (state.recordedNotes.length === 0 || state.isPlayingRecording) return;

    if (!state.audioCtx) initAudio();

    state.isPlayingRecording = true;
    document.getElementById('playRecordBtn').disabled = true;
    document.getElementById('recordBtn').disabled = true;
    document.getElementById('recordStatus').textContent = '再生中...';
    
    // 全ての音符をスケジュール
    state.recordedNotes.forEach(noteObj => {
        const timeout = setTimeout(() => {
            strikeNote(noteObj.note);
        }, noteObj.time);
        state.playbackTimeouts.push(timeout);
    });

    // 再生完了タイミングの検出（最後の音の再生タイミング + 1.5秒余韻）
    const totalTime = state.recordedNotes[state.recordedNotes.length - 1].time + 1500;
    const endTimeout = setTimeout(() => {
        stopPlayback();
    }, totalTime);
    state.playbackTimeouts.push(endTimeout);
}

/**
 * 録音データの再生を強制停止し、UIを元に戻します。
 * スケジュールされた全ての setTimeout をクリアします。
 */
export function stopPlayback() {
    state.isPlayingRecording = false;
    state.playbackTimeouts.forEach(clearTimeout);
    state.playbackTimeouts = [];
    document.getElementById('playRecordBtn').disabled = false;
    document.getElementById('recordBtn').disabled = false;
    document.getElementById('recordStatus').textContent = `録音データ: ${state.recordedNotes.length} 音`;
}

/**
 * 録音データを消去し、再生ボタンなどを無効化します。
 */
export function clearRecording() {
    stopPlayback();
    state.recordedNotes = [];
    document.getElementById('playRecordBtn').disabled = true;
    document.getElementById('clearRecordBtn').disabled = true;
    document.getElementById('recordStatus').textContent = '録音されていません。';
}
