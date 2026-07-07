/**
 * TEKKIN - 設定 & 定数モジュール
 * 
 * このモジュールは、PCキーボードのキーマッピングや、
 * 鉄琴の各音板の周波数、属性、およびデフォルトのキーヒントを設定します。
 */

/**
 * PCキーボードの物理キーと鉄琴の音名（ノート名）のマッピング
 * 
 * - ナチュラル（幹音、白いキーに相当）： a, s, d, f, g, h, j, k, l, ;, ', ]
 * - アクシデンタル（派生音、黒いキーに相当）： w, e, t, y, u, o, p, [
 */
export const KEY_MAP = {
    // 幹音 (ナチュラル)
    'a': 'C5', 's': 'D5', 'd': 'E5', 'f': 'F5', 'g': 'G5', 'h': 'A5', 'j': 'B5',
    'k': 'C6', 'l': 'D6', ';': 'E6', "'": 'F6', ']': 'G6',
    // 派生音 (アクシデンタル)
    'w': 'C#5', 'e': 'D#5', 't': 'F#5', 'y': 'G#5', 'u': 'A#5',
    'o': 'C#6', 'p': 'D#6', '[': 'F#6'
};

/**
 * 鉄琴の全音板（ノート）の構成定義
 * 
 * 各オブジェクトは以下の属性を持ちます：
 * - note: 音名（例: 'C5'）
 * - freq: 周波数（Hz）
 * - type: 'natural'（幹音）または 'accidental'（派生音）
 * - trigger: キーボード演奏時の対応キー（表示用。対応キーがない場合は空文字）
 */
export const NOTES_CONFIG = [
    // 第5オクターブ (Octave 5)
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

    // 第6オクターブ (Octave 6)
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

    // 第7オクターブ (Octave 7)
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

    // 第8オクターブ (Octave 8)
    { note: 'C8', freq: 4186.01, type: 'natural', trigger: '' }
];
