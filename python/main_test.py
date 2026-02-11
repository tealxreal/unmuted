import os
import re
from pypinyin import pinyin, Style
from pydub import AudioSegment
from datetime import datetime
from .chord_test import combine_audio, distribute_beats
from .melody_test import assign_rhythm_lengths, get_rhythm_pattern
from .effect_test import insert_effect, get_effect_index
from .config import get_chords, get_single_notes, get_emotion_path
from .gptapi import analyze_emotion

# 常數設定

INITIALS = ['b', 'c', 'ch', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 'sh', 't', 'w', 'x', 'y', 'z', 'zh']
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)

TOTAL_DURATION_SEC = 16
TOTAL_BEATS = 32
MIN_BEATS_PER_CHORD = 4
MAX_BEATS_PER_CHORD = 8

# 輸出檔案
timestamp = datetime.now().strftime("%m%d.%H%M%S")
AUDIO_OUTPUT = os.path.join(OUTPUT_DIR, f"{timestamp}.wav")

# 字母轉數值
def letter_to_value(letter):
    if letter.lower() == 'ü':
        return 22
    return ord(letter.lower()) - ord('a') + 1

# 分組邏輯
def group_sentence(sentence):
    clean = ''.join(re.findall(r'[\u4e00-\u9fffA-Za-z]', sentence))
    chars = list(clean)

    lines = [chars[i:i+8] for i in range(0, len(chars), 8)]
    max_len = max(len(line) for line in lines)
    groups = [[] for _ in range(max_len)]
    for line in lines:
        for i, char in enumerate(line):
            groups[i].append(char)
    return groups[:8]

def hash_groups(groups, emotion: str):
    CHORDS = get_chords(emotion)
    SINGLE = get_single_notes(emotion)
    debug_hash = []
    chords_result = []
    weights = []
    nweights = []
    debug_table = []
    melody_notes = []

    for group in groups:
        total = 0
    
        flat = []
        for char in group:
            if re.match(r'[\u4e00-\u9fff]', char):
                py = pinyin(char, style=Style.NORMAL)[0][0]
                flat.extend(list(py))
            elif re.match(r'[A-Za-z]', char):
                flat.append(char)

        for c in flat:
            total += letter_to_value(c)

        weights.append(total)
        mod_value = total % 7
        chord = CHORDS[mod_value]
        debug_hash.append(total)
        chords_result.append(chord)
        debug_table.append({
            "組字": ''.join(group),
            "拼音": ', '.join(flat),
            "總值": total,
            "mod 7": mod_value,
            "和弦": chord,
        })

    # 補足邏輯
    nweights = debug_table[-1]["總值"] if debug_table else 0
    offset = 1
    while len(chords_result) < 8:
        nweights = nweights + offset
        current_mod = (nweights) % 7
        chord = CHORDS[current_mod]
        chords_result.append(chord)
        weights.append(nweights)
        debug_table.append({
            "組字": "(補足)",
            "拼音": "-",
            "總值": nweights,
            "mod 7": current_mod,
            "和弦": chord
        })
        offset += 1

    # 主旋律 index
    
    mod_values = [row["mod 7"] for row in debug_table[:8]]
    as_number = int(''.join(str(v) for v in mod_values))
    print("as_number:", as_number)
    combined = str(as_number ** 3 )
    filtered_digits = ''.join([d for d in combined if d in '0123456'])
    if not filtered_digits:
        filtered_digits = ''.join(str(v) for v in mod_values)
    melody_indices = [int(d) for d in filtered_digits]
    melody_notes = [SINGLE[i] for i in melody_indices]
    rhythm_seed = get_rhythm_pattern(weights, melody_indices)

    debug_table[0]["主旋律index"] = melody_indices
    debug_table[0]["主旋律"] = melody_notes
    debug_table[0]["節奏index"] = rhythm_seed

    print(debug_table)
    return chords_result, weights, debug_table, melody_indices,rhythm_seed, melody_notes


async def generate_music(sentence: str, emotion: str):
    #emotion = os.path.basename(emotion)
    emotion = analyze_emotion(sentence)
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S_%f")
    final_audio_path = os.path.join(OUTPUT_DIR, f"{timestamp}_{emotion}.wav")

    # 轉換並分析
    groups = group_sentence(sentence)      
    chords, weights,_, _, rhythm_seed, melody_notes = hash_groups(groups, emotion)
    beat_durations = distribute_beats(weights)
    rhythm_lengths = assign_rhythm_lengths(rhythm_seed)
    #effect_index = get_effect_index(sentence)
    #melody_audio, raw_duration = combine_melody_audio(melody_notes, rhythm_lengths, emotion)
    #和弦音檔
    chord_audio = combine_audio(chords, beat_durations, sentence)
    chord_audio = chord_audio.fade_out(150).apply_gain(+3)

    if emotion == "JOY":
       chord_audio = chord_audio.apply_gain(-4)

    #melody_audio, raw_duration = combine_melody_audio(melody_notes, rhythm_lengths, emotion)
    #主旋律加音效
    melody_with_effect = insert_effect(_, sentence, _, melody_notes, rhythm_lengths, emotion)

    final = chord_audio.overlay(melody_with_effect)
    
    if emotion == "SURPRISE":
        final = final.apply_gain(+3)
    if emotion == "JOY":
        final = final.apply_gain(+1)
    if emotion == "FEAR":
        final = final.apply_gain(+5)
    if emotion == "CALM": 
        final = final.apply_gain(+3)

    final = final.fade_in(500).fade_out(1200)
    final.export(final_audio_path, format="wav") 
    # 回應音樂檔案路徑
    return final_audio_path