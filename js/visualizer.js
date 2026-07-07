/**
 * TEKKIN - ビジュアルエフェクト & ビジュアライザーモジュール
 * 
 * 音声解析用の AnalyserNode から波形データ（時間領域データ）を取得し、
 * Canvas 上にネオンカラーのオシロスコープ波形をリアルタイムで描画します。
 */

import { state } from './state.js';

/**
 * Canvas 要素を取得し、描画コンテキストを初期化します。
 * リサイズイベントの登録もここで行います。
 */
export function initCanvases() {
    state.visualizerCanvas = document.getElementById('visualizerCanvas');
    state.visualizerCtx = state.visualizerCanvas.getContext('2d');

    resizeCanvases();
    window.addEventListener('resize', resizeCanvases);
}

/**
 * 親コンテナの大きさに合わせて、Canvas の幅と高さを動的にリサイズします。
 */
export function resizeCanvases() {
    const visContainer = document.querySelector('.visualizer-container');
    if (visContainer && state.visualizerCanvas) {
        state.visualizerCanvas.width = visContainer.clientWidth;
        state.visualizerCanvas.height = visContainer.clientHeight;
    }
}

/**
 * 毎フレームごとに再帰的に呼び出されるアニメーションループです。
 * 画面更新レート（通常60fps）に合わせてビジュアライザーを描画します。
 */
export function animate() {
    drawVisualizer();
    requestAnimationFrame(animate);
}

/**
 * アナライザーから波形データを取り出し、ネオンの光彩を伴うグラデーション波形を描画します。
 * 音が鳴っていないときはフラットな基準線を描画します。
 */
export function drawVisualizer() {
    if (!state.visualizerCanvas || !state.visualizerCtx) return;

    const canvas = state.visualizerCanvas;
    const ctx = state.visualizerCtx;

    // 前のフレームの内容をクリア
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!state.analyser) {
        // 音声がまだ初期化されていないか、無音状態のときは薄い水平線を描画
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, canvas.height / 2);
        ctx.lineTo(canvas.width, canvas.height / 2);
        ctx.stroke();
        return;
    }

    const bufferLength = state.analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    // 時間領域の波形データ（振幅）を取得
    state.analyser.getByteTimeDomainData(dataArray);

    ctx.lineWidth = 3;
    
    // ネオンシアン、ピンク、ゴールドをブレンドした美しいグラデーション線
    const grad = ctx.createLinearGradient(0, 0, canvas.width, 0);
    grad.addColorStop(0, 'rgba(0, 240, 255, 0.8)');
    grad.addColorStop(0.5, 'rgba(255, 0, 127, 0.8)');
    grad.addColorStop(1, 'rgba(255, 183, 0, 0.8)');
    
    ctx.strokeStyle = grad;
    // 光るようなエフェクト（シャドウブラ―）を設定
    ctx.shadowBlur = 10;
    ctx.shadowColor = 'rgba(0, 240, 255, 0.5)';
    ctx.beginPath();

    const sliceWidth = canvas.width / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
        // 振幅の値をノーマライズ (0.0 〜 2.0 にマッピングされ、無音時は 1.0)
        const v = dataArray[i] / 128.0;
        const y = v * canvas.height / 2;

        if (i === 0) {
            ctx.moveTo(x, y);
        } else {
            ctx.lineTo(x, y);
        }

        x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();
    ctx.shadowBlur = 0; // 他の描画に影が影響しないようにリセット
}
