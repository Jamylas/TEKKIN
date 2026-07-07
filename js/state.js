/**
 * TEKKIN - 状態管理モジュール
 * 
 * アプリケーション全体で共有される動的状態（ステート）を一元管理します。
 * 各機能モジュールはこの state オブジェクトをインポートし、プロパティを参照または変更します。
 */

export const state = {
    // --- オーディオ関連ノード ---
    /** @type {AudioContext|null} Web Audio APIのコンテキスト */
    audioCtx: null,
    /** @type {GainNode|null} マスターボリューム制御用のゲインノード */
    masterGain: null,
    /** @type {DelayNode|null} ディレイエフェクト用遅延ノード */
    delayNode: null,
    /** @type {GainNode|null} ディレイのフィードバックゲインノード */
    delayFeedback: null,
    /** @type {GainNode|null} ディレイ音の出力ミックスゲインノード */
    delayMix: null,
    /** @type {ConvolverNode|null} リバーブエフェクト用畳み込み演算ノード */
    reverbConvolver: null,
    /** @type {GainNode|null} リバーブ音の出力ミックスゲインノード */
    reverbMix: null,
    /** @type {AnalyserNode|null} 音声解析用アナライザーノード (ビジュアライザー用) */
    analyser: null,

    // --- マレット & UI 設定 ---
    /** @type {string} 現在選択されているマレットの材質 ('wood' | 'brass' | 'rubber') */
    currentMallet: 'wood',
    /** @type {boolean} キーボードの音名・キー操作案内を表示するかどうか */
    isLabelsVisible: true,
    /** @type {HTMLElement|null} マウスに追従するカスタムマレットのDOM要素 */
    customMallet: null,
    /** @type {HTMLElement|null} カスタムマレットの先端(ヘッド)部分のDOM要素 */
    malletHead: null,
    /** @type {boolean} タッチ操作対応デバイスかどうかの判定フラグ */
    isTouchDevice: false,

    // --- オンラインマルチプレイヤー (WebRTC / PeerJS) 状態 ---
    /** @type {Peer|null} PeerJS インスタンス */
    peer: null,
    /** @type {Array<DataConnection>} アクティブなP2Pデータ接続のリスト */
    connections: [],
    /** @type {string} 現在のルームID（シグナリングサーバー上でのID） */
    roomId: '',
    /** @type {boolean} 自分がホスト（親）かどうか */
    isHost: false,
    /** @type {Object<string, HTMLElement>} 接続しているゲストのマレットDOM要素 (キーはPeerID) */
    guestMallets: {},
    /** @type {number} ゲストマレットに割り当てる配色インデックスの循環カウンター */
    guestColorIndex: 0,
    /** @type {Object<string, number>} ゲストに割り当てられたカラーインデックス (キーはPeerID) */
    guestColors: {},
    /** @type {Array<string>} ホストから同期されたルーム内の全ゲストのIDリスト (フェイルオーバー用) */
    allGuests: [],
    /** @type {string} 自身のローカルPeer ID */
    localPeerId: '',
    /** @type {string} 現在のマルチプレイヤーモード ('grand' | 'quick' | 'private') */
    multiplayerMode: 'private',
    /** @type {number} 野良合奏検索時のターゲットバンドインデックス (1〜5) */
    currentQuickMatchIndex: 1,
    /** @type {boolean} 野良合奏（クイックマッチ）の検索中かどうか */
    isSearchingQuickMatch: false,
    /** @type {boolean} 現在検索したバンドが満員であるかどうかのフラグ */
    isQuickMatchRoomFull: false,
    /** @type {boolean} ユーザーが手動でモード切替中かどうか（フェイルオーバーの誤作動防止） */
    isManuallySwitchingMode: false,

    // --- 録音スタジオ状態 ---
    /** @type {boolean} 演奏を録音中かどうか */
    isRecording: false,
    /** @type {number} 録音を開始したタイムスタンプ（ミリ秒） */
    recordStartTime: 0,
    /** @type {Array<{note: string, time: number}>} 録音された音符データの配列（音名と開始からの経過時間） */
    recordedNotes: [],
    /** @type {boolean} 録音データを再生中かどうか */
    isPlayingRecording: false,
    /** @type {Array<number>} 再生スケジューリング用の setTimeout ID のリスト */
    playbackTimeouts: [],

    // --- メトロノーム状態 ---
    /** @type {boolean} メトロノームが作動中かどうか */
    isPlayingMetronome: false,
    /** @type {number} テンポ (Beats Per Minute) */
    bpm: 120,
    /** @type {number} 1小節あたりの拍数（デフォルト: 4） */
    beatsPerBar: 4,
    /** @type {number} 現在の拍カウンタ (0 〜 beatsPerBar - 1) */
    currentBeat: 0,
    /** @type {number} 次のクリック音を鳴らす予定のオーディオ時間 (秒) */
    nextNoteTime: 0.0,
    /** @type {number} 先読みスケジュール時間 (秒) */
    scheduleAheadTime: 0.1,
    /** @type {number} スケジューラ呼び出しの間隔 (ミリ秒) */
    lookahead: 25.0,
    /** @type {number|null} setInterval のタイマーID */
    metronomeTimer: null,

    // --- キャンバス (ビジュアライザー) 状態 ---
    /** @type {HTMLCanvasElement|null} ビジュアライザー用キャンバス要素 */
    visualizerCanvas: null,
    /** @type {CanvasRenderingContext2D|null} ビジュアライザー用2Dコンテキスト */
    visualizerCtx: null
};
