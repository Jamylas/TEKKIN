/**
 * TEKKIN - オンライン合奏マルチプレイヤーモジュール (WebRTC PeerJS)
 * 
 * PeerJS クラウドシグナリングサーバーを介してP2Pフルメッシュ接続を確立し、
 * 打鍵データ（音名、打鍵位置）およびマレット（バチ）の3D位置座標を低遅延で双方向同期します。
 * ホスト（親）が切断された場合、残りのメンバーから辞書順で次のホストを自動選出する
 * フェイルオーバー（接続継承）機能も搭載しています。
 */

import { state } from './state.js';
import { playNoteAudio } from './audio.js';

/**
 * PeerJS 接続を確立し、自分がホスト（親）の場合はゲストの接続を待ち受け、
 * ゲスト（子）の場合はホストへ接続を開始します。
 * 
 * @param {string} id 接続先または自分のホストルームID
 */
export function initMultiplayer(id) {
    state.isManuallySwitchingMode = false; // 手動切替中フラグをリセット
    updateStatusUI('connecting', '接続サーバーにログイン中...');

    // P2P IDの割り当て
    // ホストは指定IDを使用し、ゲストはランダムなIDを生成
    state.localPeerId = state.isHost ? id : `GUEST-${Math.random().toString(36).substring(2, 8).toUpperCase()}`;
    
    // PeerJS オブジェクトの初期化 (unpkgのCDNよりロードされた Peer クラス)
    const currentPeer = new Peer(state.localPeerId, {
        debug: 1 // 警告とエラーのみコンソールに出力
    });
    state.peer = currentPeer;

    // シグナリングサーバーへの接続タイムアウト監視 (8秒)
    let loginTimeout = setTimeout(() => {
        if (state.peer === currentPeer && !currentPeer.open) {
            updateStatusUI('disconnected', '接続タイムアウト (広告ブロックや回線制限の可能性があります)');
            try {
                currentPeer.destroy();
            } catch (e) {
                console.error(e);
            }
            if (state.peer === currentPeer) {
                state.peer = null;
            }
        }
    }, 8000);

    // 接続サーバーへのログイン完了イベント
    currentPeer.on('open', () => {
        if (state.peer !== currentPeer) return;
        clearTimeout(loginTimeout);
        console.log('PeerJS server connection open. My Peer ID:', state.localPeerId);
        setupShareUI();
        
        if (state.isHost) {
            updateStatusUI('connected', 'ホストとして待機中');
            // ホストは他のゲストからのインカミング接続イベントを処理
            currentPeer.on('connection', (conn) => {
                if (state.peer !== currentPeer) return;
                handleIncomingConnection(conn, currentPeer);
            });
        } else {
            updateStatusUI('connecting', 'ホストに接続中...');
            // ゲストはホストに対してアウトゴーイング接続を開始
            const conn = currentPeer.connect(id);
            
            // 接続試行が長時間開かない場合はゾンビホストとみなし、7秒でタイムアウト処理
            const connectTimeout = setTimeout(() => {
                if (state.peer !== currentPeer) return;
                if (conn && !conn.open) {
                    console.warn(`Connection to host ${id} timed out. Host might be a zombie peer.`);
                    conn.close();
                    
                    try {
                        currentPeer.destroy();
                    } catch (e) {
                        console.error(e);
                    }
                    if (state.peer === currentPeer) {
                        state.peer = null;
                    }
                    
                    // クイックマッチ中なら次のバンドを探す、または自分がホストになる
                    if (state.isSearchingQuickMatch) {
                        console.log(`Band ${state.currentQuickMatchIndex} host timed out. Hosting this band!`);
                        state.isSearchingQuickMatch = false;
                        state.isHost = true;
                        updateModeIndicator();
                        setTimeout(() => {
                            initMultiplayer(state.roomId);
                        }, 1000);
                    } else {
                        console.log('Host timed out. Hosting the current room ID...');
                        state.isHost = true;
                        updateModeIndicator();
                        setTimeout(() => {
                            initMultiplayer(state.roomId);
                        }, 1000);
                    }
                }
            }, 7000);

            handleOutgoingConnection(conn, currentPeer, connectTimeout);
        }
    });

    // サーバーエラーハンドリング
    currentPeer.on('error', (err) => {
        if (state.peer !== currentPeer) return;
        clearTimeout(loginTimeout);
        console.error('PeerJS error:', err);
        updateStatusUI('disconnected', `接続エラー (${err.type})`);
        
        // すでにIDが使用されている（ホストが既に存在する）場合
        if (err.type === 'unavailable-id' || err.type === 'id-taken-on-server') {
            console.warn('Room ID is taken on server. Connecting as guest instead...');
            try {
                currentPeer.destroy();
            } catch(e) {
                console.error(e);
            }
            if (state.peer === currentPeer) {
                state.peer = null;
            }
            // ゲストに降格して再接続を試みる
            state.isHost = false; 
            updateModeIndicator();
            setTimeout(() => {
                initMultiplayer(state.roomId);
            }, 1000);
            return;
        }
        
        // 接続先ホストが見つからない場合
        if (err.type === 'peer-not-found' && !state.isHost) {
            try {
                currentPeer.destroy();
            } catch(e) {
                console.error(e);
            }
            if (state.peer === currentPeer) {
                state.peer = null;
            }
            if (state.isSearchingQuickMatch) {
                // そのバンドが空室だったので、自分がホストになって待機する
                console.log(`Band ${state.currentQuickMatchIndex} is empty. Hosting this band!`);
                state.isSearchingQuickMatch = false;
                state.isHost = true;
                updateModeIndicator();
                setTimeout(() => initMultiplayer(state.roomId), 1000);
            } else {
                // 通常のプライベートルームで親がいない場合は、自分が親になる
                console.log('Host not found. Hosting the current room ID...');
                state.isHost = true;
                updateModeIndicator();
                setTimeout(() => initMultiplayer(state.roomId), 1000);
            }
        }
    });
}

/**
 * ホスト側で、ゲストからの接続を受信した際の初期化とデータリスナー登録を行います。
 * 
 * @param {DataConnection} conn 確立されたP2P接続オブジェクト
 * @param {Peer} currentPeer 現在稼働中の PeerJS インスタンス
 */
function handleIncomingConnection(conn, currentPeer) {
    // 野良合奏(quick)モードで接続メンバーが4人（合計5人）以上の場合は満員として拒絶
    if (state.multiplayerMode === 'quick' && state.connections.length >= 4) {
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
        if (state.peer !== currentPeer) return;
        console.log('Guest connected:', conn.peer);
        state.connections.push(conn);
        assignGuestColor(conn.peer);
        updatePeerCountUI();
        updateStatusUI('connected', `セッション接続中`);
        
        // 新しいゲストの参加を他のすべての既存ゲストに通知
        broadcast({
            type: 'peer_joined',
            peerId: conn.peer
        }, conn.peer); // 本人を除く
        
        // ゲストのIDリストを同期（フェイルオーバー用）
        syncGuestsList();
    });

    conn.on('data', (data) => {
        if (state.peer !== currentPeer) return;
        handleDataMessage(data, conn.peer);
    });

    conn.on('close', () => {
        if (state.peer !== currentPeer) return;
        console.log('Guest disconnected:', conn.peer);
        removeConnection(conn);
    });
    
    conn.on('error', () => {
        if (state.peer !== currentPeer) return;
        removeConnection(conn);
    });
}

/**
 * ゲスト側で、ホストへの接続試行が完了した際、または切断された際の処理を行います。
 * 
 * @param {DataConnection} conn 確立されたP2P接続オブジェクト
 * @param {Peer} currentPeer 現在稼働中の PeerJS インスタンス
 * @param {number} connectTimeout 接続タイムアウト用のタイマーID
 */
function handleOutgoingConnection(conn, currentPeer, connectTimeout) {
    conn.on('open', () => {
        if (state.peer !== currentPeer) return;
        if (connectTimeout) clearTimeout(connectTimeout);
        console.log('Connected to Host!');
        state.connections.push(conn);
        updateStatusUI('connected', `セッション接続中`);
        
        if (state.isSearchingQuickMatch) {
            state.isSearchingQuickMatch = false;
            updateModeIndicator();
        }
    });

    conn.on('data', (data) => {
        if (state.peer !== currentPeer) return;
        handleDataMessage(data, conn.peer);
    });

    conn.on('close', () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        if (state.peer !== currentPeer) return;
        console.log('Host disconnected.');
        updateStatusUI('disconnected', '接続が切断されました');
        removeConnection(conn);
        
        if (state.isManuallySwitchingMode) return; // ユーザー操作による切替時は継承処理をスキップ
        
        if (state.isSearchingQuickMatch && state.isQuickMatchRoomFull) {
            // クイックマッチ中に満員で断られた場合は次の部屋へ進む
            state.isQuickMatchRoomFull = false;
            if (state.peer) {
                try {
                    state.peer.destroy();
                } catch (e) {
                    console.error(e);
                }
                state.peer = null;
            }
            state.currentQuickMatchIndex++;
            setTimeout(() => {
                startQuickMatchSearch();
            }, 1000);
        } else if (!state.isHost) {
            // ホスト（親）が突然切断した場合は、新しい親を決定するフェイルオーバー処理
            handleHostDisconnect();
        }
    });
    
    conn.on('error', () => {
        if (connectTimeout) clearTimeout(connectTimeout);
        if (state.peer !== currentPeer) return;
        removeConnection(conn);
    });
}

/**
 * ネットワークから受信した各種データメッセージを解析して対応する処理を行います。
 * 
 * @param {Object} data 受信したJSONデータオブジェクト
 * @param {string} senderId 送信元のPeer ID
 */
function handleDataMessage(data, senderId) {
    if (data.type === 'strike') {
        // 他人が鳴らした音をローカルで再生
        playReceivedStrike(data.note, data.relativeY, senderId);
        
        // ホストの場合は、全員にデータをリレー配信 (ブロードキャスト)
        if (state.isHost) {
            broadcast(data, senderId);
        }
    } else if (data.type === 'mousemove') {
        // 公開アリーナ（全員合奏）モード以外では、他の人のマレットの画面移動を同期
        if (state.multiplayerMode !== 'grand') {
            updateGuestMallet(senderId, data.x, data.y, data.malletType, data.isStriking);
            
            if (state.isHost) {
                broadcast(data, senderId);
            }
        }
    } else if (data.type === 'peer_joined') {
        assignGuestColor(data.peerId);
    } else if (data.type === 'peer_left') {
        removeGuestMallet(data.peerId);
    } else if (data.type === 'sync_guests') {
        state.allGuests = data.guests;
        console.log('Synced guests list from host:', state.allGuests);
        updatePeerCountUI();
    } else if (data.type === 'room_full') {
        console.log(`Room ${state.roomId} is full! Moving to next room...`);
        state.isQuickMatchRoomFull = true;
    }
}

/**
 * 接続している全ピアにメッセージを配信します。
 * 
 * @param {Object} message 配信するメッセージオブジェクト
 * @param {string} [excludePeerId=null] 除外するピアのID（リレー元への返送防止など）
 */
export function broadcast(message, excludePeerId = null) {
    state.connections.forEach(conn => {
        if (conn.peer !== excludePeerId && conn.open) {
            conn.send(message);
        }
    });
}

/**
 * 他人から送られてきた打鍵データをローカルのキーボードに適用し、サウンドを生成します。
 * 
 * @param {string} note 音名 (例: 'C5')
 * @param {number} relativeY 打鍵位置 (0.0 〜 1.0)
 * @param {string} senderId 送信元のPeer ID
 */
function playReceivedStrike(note, relativeY, senderId) {
    const keyEl = document.querySelector(`.key[data-note="${note}"]`);
    if (keyEl) {
        // 叩かれたキーを一瞬アクティブ（発光）表示
        keyEl.classList.add('active');
        setTimeout(() => keyEl.classList.remove('active'), 100);
        
        const freq = parseFloat(keyEl.getAttribute('data-freq'));
        playNoteAudio(freq, relativeY);
    }
}

/**
 * ゲスト（他のプレイヤー）のマレットDOM要素を作成・更新し、画面上の位置を同期します。
 * 
 * @param {string} peerId ゲストのPeer ID
 * @param {number} x 相対X座標 (0.0 〜 1.0)。画面外（非アクティブ）は -100。
 * @param {number} y 相対Y座標 (0.0 〜 1.0)
 * @param {string} malletType マレットの材質 ('wood' | 'brass' | 'rubber')
 * @param {boolean} isStriking 叩くアニメーション状態（振り下ろしているか）
 */
export function updateGuestMallet(peerId, x, y, malletType, isStriking) {
    let malletEl = state.guestMallets[peerId];
    if (!malletEl) {
        // 新しいマレット要素を動的に生成
        malletEl = document.createElement('div');
        malletEl.className = 'custom-mallet guest';
        
        const colorIdx = state.guestColors[peerId] || assignGuestColor(peerId);
        malletEl.classList.add(`guest-${colorIdx}`);
        
        malletEl.innerHTML = `
            <div class="mallet-inner">
                <div class="mallet-head ${malletType}"></div>
                <div class="mallet-shaft"></div>
            </div>
        `;
        document.body.appendChild(malletEl);
        state.guestMallets[peerId] = malletEl;
    }
    
    // 画面外フラグ
    if (x < 0) {
        malletEl.style.display = 'none';
        return;
    }
    
    // 親コンテナに対する相対位置から絶対位置(px)を算出して配置
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
    
    // 打鍵アクションクラスの切り替え
    if (isStriking) {
        malletEl.classList.add('striking');
    } else {
        malletEl.classList.remove('striking');
    }
}

/**
 * ゲストIDに対して、4色のうちの1色を固有マレット色として割り当てます。
 * 
 * @param {string} peerId ゲストのPeer ID
 * @returns {number} 割り当てられたカラーインデックス (1〜4)
 */
export function assignGuestColor(peerId) {
    if (state.guestColors[peerId]) return state.guestColors[peerId];
    
    state.guestColorIndex = (state.guestColorIndex % 4) + 1;
    state.guestColors[peerId] = state.guestColorIndex;
    return state.guestColorIndex;
}

/**
 * ゲストが切断した際、そのゲストのマレットDOM要素を削除してメモリからクリーンアップします。
 * 
 * @param {string} peerId ゲストのPeer ID
 */
export function removeGuestMallet(peerId) {
    const malletEl = state.guestMallets[peerId];
    if (malletEl) {
        malletEl.remove();
        delete state.guestMallets[peerId];
    }
    delete state.guestColors[peerId];
    updatePeerCountUI();
}

/**
 * 特定のピアとの接続を切断し、マレットなどの関連情報を消去します。
 * 
 * @param {DataConnection} conn 削除する接続オブジェクト
 */
function removeConnection(conn) {
    const index = state.connections.indexOf(conn);
    if (index > -1) {
        state.connections.splice(index, 1);
    }
    removeGuestMallet(conn.peer);
    
    if (state.isHost) {
        // 他のプレイヤーに、対象メンバーが退出したことを通知
        broadcast({
            type: 'peer_left',
            peerId: conn.peer
        });
        // メンバーリストを再同期
        syncGuestsList();
    }
    
    if (state.connections.length === 0) {
        if (state.isHost) {
            updateStatusUI('connected', 'ホストとして待機中');
        } else {
            updateStatusUI('disconnected', '接続が切断されました');
            state.allGuests = [];
        }
    }
    updatePeerCountUI();
}

/**
 * ホスト専用：現在接続が確立しているアクティブなゲストの一覧を、全員に配信（再同期）します。
 */
function syncGuestsList() {
    if (!state.isHost) return;
    const guestList = state.connections.filter(c => c.open).map(c => c.peer);
    broadcast({
        type: 'sync_guests',
        guests: guestList
    });
}

/**
 * ホスト（親）が突然切断された場合の自動ホスト継承（フェイルオーバー）ロジック。
 * ルーム内のゲスト全員で同期されている `allGuests` リストをソートし、
 * 最も優先度の高い（辞書順最小）ゲストが自動的にホストに昇格し、他のゲストは新しい親へ自動再接続します。
 */
function handleHostDisconnect() {
    console.log('Host disconnected. Starting failover logic. Guests in room:', state.allGuests);
    updateStatusUI('connecting', 'ホスト切断のため再接続中...');

    // 空のIDを除外してソート
    const activeGuests = [...state.allGuests].filter(id => id).sort();
    
    // 全てのゲストマレット表示を一旦リセット
    Object.keys(state.guestMallets).forEach(peerId => {
        removeGuestMallet(peerId);
    });

    if (activeGuests.length === 0 || state.localPeerId === activeGuests[0]) {
        // 自分がリストの先頭＝継承権1位！ ホスト（親）に昇格！
        console.log('I am the successor. Re-registering as Host in 2.5s...');
        state.isHost = true;
        updateModeIndicator();
        
        if (state.peer) {
            try {
                state.peer.destroy();
            } catch (e) {
                console.error(e);
            }
            state.peer = null;
        }
        updatePeerCountUI();
        
        // サーバー側のPeer ID解放時間を考慮し、2.5秒遅らせて元の部屋IDでホストとして開局
        setTimeout(() => {
            console.log('Promoting to host now with ID:', state.roomId);
            initMultiplayer(state.roomId);
        }, 2500);
    } else {
        // 自分は継承権1位ではないので、昇格する新ホスト（activeGuests[0]）を待って接続
        console.log(`Successor is ${activeGuests[0]}. Waiting 5s to reconnect...`);
        state.isHost = false;
        updateModeIndicator();
        
        if (state.peer) {
            try {
                state.peer.destroy();
            } catch (e) {
                console.error(e);
            }
            state.peer = null;
        }
        updatePeerCountUI();
        
        // 新ホストの起動時間を考慮し、5秒後に同じ部屋IDへゲスト接続
        setTimeout(() => {
            console.log('Connecting to new host now...');
            initMultiplayer(state.roomId);
        }, 5000);
    }
}

/**
 * 共有用の合奏URLを作成し、UIのインプットボックスにセットします。
 */
function setupShareUI() {
    const shareUrlInput = document.getElementById('shareUrlInput');
    const copyBtn = document.getElementById('copyShareUrlBtn');
    if (!shareUrlInput || !copyBtn) return;
    
    const shareUrl = `${window.location.origin}${window.location.pathname}#${state.roomId}`;
    shareUrlInput.value = shareUrl;
    copyBtn.disabled = false;
}

/**
 * 合奏モード（公開アリーナ、野良合奏、非公開ルーム）を切り替えます。
 * 
 * @param {string} mode 移行するモード ('grand' | 'quick' | 'private')
 */
export function switchMultiplayerMode(mode) {
    state.isSearchingQuickMatch = false; // 進行中のクイックマッチ検索を中断
    state.isManuallySwitchingMode = true; // フェイルオーバーの暴発を抑制
    
    console.log(`Switching multiplayer mode to: ${mode}`);
    state.multiplayerMode = mode;
    
    if (state.peer) {
        try {
            state.peer.destroy();
        } catch (e) {
            console.error(e);
        }
        state.peer = null;
    }
    
    // 既存ゲストマレットのクリーンアップ
    Object.keys(state.guestMallets).forEach(peerId => {
        removeGuestMallet(peerId);
    });
    state.connections = [];
    state.allGuests = [];
    updatePeerCountUI();

    if (mode === 'grand') {
        state.isHost = true; // まずホストとして開局を試み、失敗時はゲストにフォールバック
        state.roomId = 'TEKKIN-GRAND-ARENA-JAMYLAS-V2';
        window.location.hash = state.roomId;
        updateModeIndicator();
        initMultiplayer(state.roomId);
    } else if (mode === 'quick') {
        state.isHost = false;
        state.currentQuickMatchIndex = 1;
        state.isSearchingQuickMatch = true;
        startQuickMatchSearch();
    } else if (mode === 'private') {
        state.isHost = true;
        const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
        state.roomId = `TEKKIN-${randId}`;
        window.location.hash = state.roomId;
        updateModeIndicator();
        initMultiplayer(state.roomId);
    }
}

/**
 * 野良合奏 (バンド 1〜5) を順次探索し、最初に空いていた、またはホストが開いている部屋へ接続します。
 * 1〜5すべてが満員だった場合は、新しいテンポラリバンドを生成します。
 */
export function startQuickMatchSearch() {
    if (state.currentQuickMatchIndex > 5) {
        console.log('All public bands are full. Creating a temporary private band...');
        state.isSearchingQuickMatch = false;
        state.multiplayerMode = 'private';
        state.isHost = true;
        const randId = Math.random().toString(36).substring(2, 8).toUpperCase();
        state.roomId = `TEKKIN-BAND-TEMP-${randId}`;
        window.location.hash = state.roomId;
        updateModeIndicator();
        initMultiplayer(state.roomId);
        return;
    }

    console.log(`Quick Match: Checking Band ${state.currentQuickMatchIndex}...`);
    state.roomId = `TEKKIN-BAND-JAMYLAS-V2-${state.currentQuickMatchIndex}`;
    window.location.hash = state.roomId;
    state.isHost = true; // 部屋の所有権を確認するため、まずホストとしてログインを試みる
    updateModeIndicator(`野良合奏 (バンド ${state.currentQuickMatchIndex} 検索中...)`);
    initMultiplayer(state.roomId);
}

/**
 * UIの「接続モード」インジケーターテキストを最新の接続状態に更新します。
 * 
 * @param {string} [customText=null] 指定のカスタムテキスト（検索中表示などに使用）
 */
export function updateModeIndicator(customText = null) {
    const indicator = document.getElementById('modeIndicator');
    if (!indicator) return;

    if (customText) {
        indicator.textContent = `接続モード: ${customText}`;
        return;
    }

    let modeName = '';
    if (state.multiplayerMode === 'grand') {
        modeName = '公開アリーナ (全員合奏・マレット非表示)';
    } else if (state.multiplayerMode === 'quick') {
        modeName = `野良合奏 (バンド: ${state.roomId.replace('TEKKIN-', '')})`;
    } else if (state.multiplayerMode === 'private') {
        modeName = `非公開ルーム (ID: ${state.roomId.replace('TEKKIN-', '')})`;
    }
    indicator.textContent = `接続モード: ${modeName}`;
}

/**
 * UI上のステータスランプ(LEDドット)と、ステータスラベルの内容を更新します。
 * 
 * @param {string} statusClass ランプのスタイルクラス ('connecting' | 'connected' | 'disconnected')
 * @param {string} text ステータス表示メッセージ
 */
export function updateStatusUI(statusClass, text) {
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

/**
 * UI上に現在の合奏中の合計接続人数を表示します。
 */
export function updatePeerCountUI() {
    const label = document.getElementById('peerCountLabel');
    if (!label) return;

    if (state.peer && (state.peer.open || state.connections.length > 0)) {
        let count = 1;
        if (state.isHost) {
            count = state.connections.length + 1;
        } else {
            if (state.connections.length > 0) {
                count = Math.max(state.connections.length + 1, state.allGuests.length + 1);
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
