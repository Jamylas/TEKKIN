/**
 * TEKKIN - メインエントリーポイントモジュール
 * 
 * DOMContentLoadedのタイミングで各モジュール（キャンバス、キーボード、イベントリスナー）を初期化し、
 * URLのハッシュ解析に基づいてマルチプレイヤー（WebRTC）の初期モード接続処理を開始します。
 * また、ページ離脱時のP2Pクリーンアップ処理もハンドリングします。
 */

import { state } from './state.js';
import { initCanvases, animate } from './visualizer.js';
import { renderKeyboard, setupEventListeners, updateMalletHeadStyle } from './ui.js';
import { initMultiplayer, updateModeIndicator } from './multiplayer.js';

// --- アプリケーションの初期化処理 ---
window.addEventListener('DOMContentLoaded', () => {
    // 画面に追従するカスタムマレットのDOM要素をバインド
    state.customMallet = document.getElementById('customMallet');
    if (state.customMallet) {
        state.malletHead = state.customMallet.querySelector('.mallet-head');
        updateMalletHeadStyle();
    }

    // 1. 各キャンバスの初期化
    initCanvases();
    // 2. 鍵盤のレンダリング
    renderKeyboard();
    // 3. UI、マウス、キーボード、タッチ操作のイベントリスナー設定
    setupEventListeners();
    // 4. アニメーション描画ループ（ビジュアライザー）の開始
    animate();

    // URLハッシュ（例: #TEKKIN-ABCD）に基づきマルチプレイヤー接続を初期化
    const hash = window.location.hash;
    if (hash && hash.startsWith('#TEKKIN-')) {
        state.roomId = hash.substring(1); // 先頭の '#' を除去
        state.isHost = false; // ハッシュ指定によるアクセスは基本的にゲスト参加
        
        // 公開アリーナ（全員合奏）判定
        if (state.roomId === 'TEKKIN-GRAND-ARENA-JAMYLAS-V2' || state.roomId === 'TEKKIN-GRAND-ARENA-JAMYLAS') {
            state.multiplayerMode = 'grand';
            // V1用ハッシュの場合はV2にURLをマイグレーション
            if (state.roomId === 'TEKKIN-GRAND-ARENA-JAMYLAS') {
                state.roomId = 'TEKKIN-GRAND-ARENA-JAMYLAS-V2';
                window.location.hash = state.roomId;
            }
        } 
        // 野良合奏（クイックマッチ）バンドルーム判定
        else if ((state.roomId.startsWith('TEKKIN-BAND-JAMYLAS-V2-') || state.roomId.startsWith('TEKKIN-BAND-JAMYLAS-')) && !state.roomId.startsWith('TEKKIN-BAND-TEMP-')) {
            state.multiplayerMode = 'quick';
            const match = state.roomId.match(/TEKKIN-BAND-(?:JAMYLAS-V2-|JAMYLAS-)(\d+)/);
            if (match) {
                state.currentQuickMatchIndex = parseInt(match[1]);
            }
            // V1用ハッシュの場合はV2へマイグレーション
            if (state.roomId.startsWith('TEKKIN-BAND-JAMYLAS-') && !state.roomId.startsWith('TEKKIN-BAND-JAMYLAS-V2-')) {
                state.roomId = `TEKKIN-BAND-JAMYLAS-V2-${state.currentQuickMatchIndex}`;
                window.location.hash = state.roomId;
            }
        } 
        // 非公開ルーム判定
        else {
            state.multiplayerMode = 'private';
        }
        
        // モード表示の更新とP2P接続開始
        updateModeIndicator();
        initMultiplayer(state.roomId);
    } else {
        // ハッシュなし、または不正なハッシュの場合はデフォルトで「公開アリーナ (Grand Arena)」に接続
        state.multiplayerMode = 'grand';
        state.isHost = true; // 最初にホスト接続を試み、他のプレイヤーが先にいればゲストに自動降格される
        state.roomId = 'TEKKIN-GRAND-ARENA-JAMYLAS-V2';
        window.location.hash = state.roomId;
        
        updateModeIndicator();
        initMultiplayer(state.roomId);
    }
});

// リロード・ページ離脱時のゾンビピア（シグナリングサーバーに残存する無効なセッション）防止クリーンアップ
window.addEventListener('beforeunload', () => {
    if (state.peer) {
        try {
            state.peer.destroy();
        } catch (e) {
            console.error('PeerJS クリーンアップエラー:', e);
        }
    }
});
