/**
 * TEKKIN - UI & イベント処理モジュール
 * 
 * 鉄琴音板（37鍵）のHTML要素の動的生成、キーボード/マウス/タッチ操作のイベント監視、
 * 打鍵アニメーションの制御、および各種エフェクトスライダーなどのUIコントロールとの同期を行います。
 */

import { state } from './state.js';
import { KEY_MAP, NOTES_CONFIG } from './config.js';
import { initAudio, playNoteAudio, updateEffects } from './audio.js';
import { broadcast, switchMultiplayerMode, initMultiplayer } from './multiplayer.js';
import { toggleMetronome } from './metronome.js';
import { toggleRecording, playRecordedSequence, clearRecording } from './recording.js';

/**
 * 鍵盤（音板）を叩いた（演奏した）際のアクションを実行します。
 * 自身のサウンドを鳴らし、UIアニメーションを起動し、録音中ならデータを記録し、
 * オンラインセッション中ならピア全員に打鍵データをブロードキャストします。
 * 
 * @param {string} noteName 音名 (例: 'C5')
 * @param {number} [relativeY=0.5] 打鍵した縦方向の相対位置 (0.0 〜 1.0)
 */
export function strikeNote(noteName, relativeY = 0.5) {
    if (!state.audioCtx) {
        initAudio();
    }
    
    const keyEl = document.querySelector(`.key[data-note="${noteName}"]`);
    if (!keyEl) return;

    // 鍵盤の発光アニメーションクラスを追加し、100ms後に削除
    keyEl.classList.add('active');
    setTimeout(() => keyEl.classList.remove('active'), 100);

    // 音声を再生
    const freq = parseFloat(keyEl.getAttribute('data-freq'));
    playNoteAudio(freq, relativeY);

    // ピア全員へリアルタイム打鍵データをブロードキャスト
    if (state.peer && state.connections.length > 0) {
        broadcast({
            type: 'strike',
            note: noteName,
            relativeY: relativeY
        });
    }

    // 録音中なら音名と録音開始からの相対経過時間(ms)をプッシュ
    if (state.isRecording) {
        state.recordedNotes.push({
            note: noteName,
            time: Date.now() - state.recordStartTime
        });
        document.getElementById('recordStatus').textContent = `録音中... (${state.recordedNotes.length} 音)`;
    }
}

/**
 * マレット（バチ）の選択に合わせて、カスタムマレットDOM要素の見た目（CSSクラス）を更新します。
 */
export function updateMalletHeadStyle() {
    if (state.malletHead) {
        state.malletHead.className = `mallet-head ${state.currentMallet}`;
    }
}

/**
 * アプリケーションのすべてのユーザー操作イベント（クリック、スライド、タッチ、キーボード、各種ボタン、スライダー）に対するリスナーを設定します。
 */
export function setupEventListeners() {
    const keys = document.querySelectorAll('.key');
    let isMouseDown = false;

    // --- マウス操作イベント ---
    keys.forEach(k => {
        // クリック時: クリック位置の相対高さ(relativeY)を計算して打鍵
        k.addEventListener('mousedown', (e) => {
            isMouseDown = true;
            const rect = k.getBoundingClientRect();
            const relativeY = (e.clientY - rect.top) / rect.height;
            strikeNote(k.getAttribute('data-note'), relativeY);
        });

        // ドラッグ（スライド）演奏: マウスが押し下げられた状態で音板に入ったら、中央付近(0.5)の高さで打鍵
        k.addEventListener('mouseenter', () => {
            if (isMouseDown) {
                strikeNote(k.getAttribute('data-note'), 0.5);
            }
        });
    });

    window.addEventListener('mouseup', () => {
        isMouseDown = false;
    });

    // --- タッチ操作イベント (マルチタッチ対応) ---
    const container = document.getElementById('keysContainer');
    let activeTouches = {};

    container.addEventListener('touchstart', (e) => {
        e.preventDefault();
        if (!state.audioCtx) initAudio();
        
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
                // 音板をまたいで移動（スライド）した場合のみ打鍵
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

    // --- PCキーボード操作イベント ---
    window.addEventListener('keydown', (e) => {
        const key = e.key.toLowerCase();
        if (KEY_MAP[key]) {
            // キーを押しっぱなしにした時の連打（リピート）を防止
            if (e.repeat) return;
            strikeNote(KEY_MAP[key]);
        }
    });

    // --- エフェクトスライダーイベント ---
    document.getElementById('reverbSlider').addEventListener('input', updateEffects);
    document.getElementById('delayTimeSlider').addEventListener('input', updateEffects);
    document.getElementById('delayFeedbackSlider').addEventListener('input', updateEffects);
    document.getElementById('volumeSlider').addEventListener('input', updateEffects);

    // --- マレット（バチ）選択 ---
    document.getElementById('malletSelect').addEventListener('change', (e) => {
        state.currentMallet = e.target.value;
        updateMalletHeadStyle();
    });

    // --- マウス追従用カスタムマレットのアニメーション & 位置座標同期 ---
    let lastMouseMoveTime = 0;
    document.addEventListener('mousemove', (e) => {
        // タッチ操作時や、カスタムマレットが読み込まれていない場合は処理しない
        if (state.isTouchDevice || !state.customMallet) return;
        
        const isOverInstrument = e.target.closest('.instrument-container') !== null;
        
        if (isOverInstrument) {
            state.customMallet.style.display = 'block';
            state.customMallet.style.transform = `translate3d(${e.clientX}px, ${e.clientY}px, 0)`;
        } else {
            state.customMallet.style.display = 'none';
        }

        // P2P合奏用にマレット位置をピアへ送信 (約25fpsにスロットリング制御)
        const now = Date.now();
        if (now - lastMouseMoveTime > 40) {
            if (state.peer && state.connections.length > 0 && state.multiplayerMode !== 'grand') {
                const instContainer = document.querySelector('.instrument-container');
                const rect = instContainer.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const isOver = x >= 0 && x <= 1 && y >= 0 && y <= 1;

                broadcast({
                    type: 'mousemove',
                    x: isOver ? x : -100, // 範囲外なら画面外フラグを送る
                    y: isOver ? y : -100,
                    malletType: state.currentMallet,
                    isStriking: state.customMallet.classList.contains('striking')
                });
            }
            lastMouseMoveTime = now;
        }
    });

    // クリック時にマレットを一瞬振り下ろすアクション（strikingクラス追加）
    document.addEventListener('mousedown', (e) => {
        if (!state.isTouchDevice && state.customMallet && e.target.closest('.instrument-container')) {
            state.customMallet.classList.add('striking');

            // クリックの瞬間の状態をピアへ即座に送信
            if (state.peer && state.connections.length > 0 && state.multiplayerMode !== 'grand') {
                const instContainer = document.querySelector('.instrument-container');
                const rect = instContainer.getBoundingClientRect();
                const x = (e.clientX - rect.left) / rect.width;
                const y = (e.clientY - rect.top) / rect.height;
                const isOver = x >= 0 && x <= 1 && y >= 0 && y <= 1;

                broadcast({
                    type: 'mousemove',
                    x: isOver ? x : -100,
                    y: isOver ? y : -100,
                    malletType: state.currentMallet,
                    isStriking: true
                });
            }
        }
    });

    document.addEventListener('mouseup', () => {
        if (state.customMallet) {
            state.customMallet.classList.remove('striking');

            // マレットが戻った状態をピアへ即座に送信
            if (state.peer && state.connections.length > 0 && state.multiplayerMode !== 'grand') {
                broadcast({
                    type: 'mousemove',
                    x: -100,
                    y: -100,
                    malletType: state.currentMallet,
                    isStriking: false
                });
            }
        }
    });

    // タッチ開始を検知した場合はタッチデバイスと判定し、デスクトップ用カスタムマレットを非表示にする
    document.addEventListener('touchstart', () => {
        state.isTouchDevice = true;
        if (state.customMallet) {
            state.customMallet.style.display = 'none';
        }
    }, { passive: true });

    // --- その他UIボタンのイベントリスナー登録 ---

    // 合奏URLコピーボタン
    document.getElementById('copyShareUrlBtn').addEventListener('click', () => {
        const shareUrlInput = document.getElementById('shareUrlInput');
        shareUrlInput.select();
        shareUrlInput.setSelectionRange(0, 99999); // モバイル対応
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

    // 再接続ボタン
    document.getElementById('reconnectBtn').addEventListener('click', () => {
        if (state.peer) {
            try {
                state.peer.destroy();
            } catch (e) {
                console.error(e);
            }
            state.peer = null;
        }
        initMultiplayer(state.roomId);
    });

    // 各合奏モード切替ボタン
    document.getElementById('joinGrandArenaBtn').addEventListener('click', () => {
        switchMultiplayerMode('grand');
    });

    document.getElementById('joinQuickMatchBtn').addEventListener('click', () => {
        switchMultiplayerMode('quick');
    });

    document.getElementById('createPrivateRoomBtn').addEventListener('click', () => {
        switchMultiplayerMode('private');
    });

    // キーボード案内表示チェックボックス
    document.getElementById('toggleKeyboardLabels').addEventListener('change', (e) => {
        state.isLabelsVisible = e.target.checked;
        const keysFrame = document.querySelector('.keys-container');
        if (state.isLabelsVisible) {
            keysFrame.classList.remove('hide-labels');
        } else {
            keysFrame.classList.add('hide-labels');
        }
    });

    // --- メトロノーム関係コントロール ---
    const bpmSlider = document.getElementById('bpmSlider');
    const bpmInput = document.getElementById('bpmInput');
    const bpmValueLabel = document.getElementById('bpmValue');
    const beatSelect = document.getElementById('beatSelect');
    const metronomeToggleBtn = document.getElementById('metronomeToggleBtn');

    function updateBpmVal(newBpm) {
        state.bpm = Math.min(Math.max(parseInt(newBpm) || 120, 40), 240);
        bpmSlider.value = state.bpm;
        bpmInput.value = state.bpm;
        bpmValueLabel.textContent = state.bpm;
    }

    bpmSlider.addEventListener('input', (e) => {
        updateBpmVal(e.target.value);
    });

    bpmInput.addEventListener('change', (e) => {
        updateBpmVal(e.target.value);
    });

    beatSelect.addEventListener('change', (e) => {
        state.beatsPerBar = parseInt(e.target.value) || 4;
        state.currentBeat = 0; // 拍の位置を先頭へアライメント
    });

    metronomeToggleBtn.addEventListener('click', toggleMetronome);

    // --- 録音スタジオ関係コントロール ---
    const recordBtn = document.getElementById('recordBtn');
    const playRecordBtn = document.getElementById('playRecordBtn');
    const clearRecordBtn = document.getElementById('clearRecordBtn');

    recordBtn.addEventListener('click', toggleRecording);
    playRecordBtn.addEventListener('click', playRecordedSequence);
    clearRecordBtn.addEventListener('click', clearRecording);
}

/**
 * 設定された `NOTES_CONFIG` データに基づいて、HTML 上に鉄琴の音板群（幹音、派生音）を動的に描画します。
 * 鉄琴らしい傾斜（低音ほど大きく、高音ほど小さいサイズ）を高さ計算で表現します。
 */
export function renderKeyboard() {
    const container = document.getElementById('keysContainer');
    if (!container) return;

    // 幹音 (natural) と派生音 (accidental) に分割
    const naturals = NOTES_CONFIG.filter(n => n.type === 'natural');
    const accidentals = NOTES_CONFIG.filter(n => n.type === 'accidental');

    // 幹音と派生音それぞれのラッパー要素を作成
    const naturalWrapper = document.createElement('div');
    naturalWrapper.className = 'natural-keys';

    const accidentalWrapper = document.createElement('div');
    accidentalWrapper.className = 'accidental-keys';

    const totalNaturals = naturals.length;
    
    // 1. 幹音 (白鍵に相当する部分) のレンダリング
    // 低音 C5 (高さ360px) から 高音 C8 (高さ240px) に向かって緩やかに傾斜するよう高さを補間
    naturals.forEach((n, i) => {
        const keyEl = document.createElement('div');
        keyEl.className = 'key natural';
        keyEl.setAttribute('data-note', n.note);
        keyEl.setAttribute('data-freq', n.freq);
        if (n.trigger) {
            keyEl.setAttribute('data-trigger', n.trigger);
        }

        // 高さを直線補間で算出
        const height = 360 - i * (120 / (totalNaturals - 1));
        keyEl.style.height = `${Math.round(height)}px`;

        // 飾りネジ、音名ラベル、キーヒントを流し込み
        keyEl.innerHTML = `
            <div class="screw screw-top"></div>
            <div class="note-name">${n.note}</div>
            ${n.trigger ? `<div class="key-hint">${n.trigger}</div>` : ''}
            <div class="screw screw-bottom"></div>
        `;
        naturalWrapper.appendChild(keyEl);
    });

    // 2. 派生音 (黒鍵に相当する部分) のレンダリング
    // 対応する幹音の隙間に重なるようパーセントで left 座標を計算
    // 高さは、挟まれる左右の幹音の平均高さの 76% に設定
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
            
            // 隙間（ gap ）の真上に配置するための left 座標計算
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

    // 既存の中身をクリアして追加
    container.innerHTML = '';
    container.appendChild(naturalWrapper);
    container.appendChild(accidentalWrapper);
}
