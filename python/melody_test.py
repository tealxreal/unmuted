import os
from pydub import AudioSegment
import subprocess
from .config import get_emotion_path
from .gptapi import analyze_emotion

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHORD_DIR = os.path.join(BASE_DIR, "chord_note_test")
TOTAL_DURATION_SEC = 16
TOTAL_BEATS = 32
MIN_BEATS_PER_CHORD = 4
MAX_BEATS_PER_CHORD = 6

# 時值庫：BPM = 120，每拍 0.5 秒
note_durations = {
    "4N": 0.5,    #0
    "4.N": 0.75,     #1
    "8.N": 0.375,    #2 取消8分音符改8分附點
    "4R": 0.5,     #3
    "2.N": 1.5,    #4
    "16N": 1.25,   #5 0.125改成1.25
    "8.NN": 1.75,  #6 改1.75
    "2R": 1,     #7 二分休止符
    "2N": 1.0,     #8 四分休止符
    "8R": 0.5,    #9 八分休止符改四分休止
}

NOTE_KEYS = list(note_durations.keys())

def get_rhythm_pattern(weights, melody_indices):
    """根據加權與主旋律 index 生成節奏長度序列"""
    W = weights[:8]
    A = [(w % 10) + 1 for w in W]
    B = [((w % 7) + 1) if (w % 7) != 9 else 9 for w in W]
    products = [a * b for a, b in zip(A, B)]
    pattern_seed = ''.join(str(p) for p in products) + ''.join(str(i) for i in melody_indices)

    print(products)
    print(pattern_seed)
    return pattern_seed

def assign_rhythm_lengths(pattern_seed):
    """根據完整節奏種子，產生節奏長度序列（包含休止符）"""
    rhythm_lengths = []
    for digit in pattern_seed:
        digit = int(digit)
        key_index = digit % len(NOTE_KEYS)
        rhythm_key = NOTE_KEYS[key_index]
        rhythm_lengths.append(rhythm_key)
    print(rhythm_lengths)    
    return rhythm_lengths

# 主旋律音檔
def combine_melody_audio(melody_notes, rhythm_lengths, sentence: str):
    
    beat_ms = (TOTAL_DURATION_SEC * 1000) / TOTAL_BEATS
    output = AudioSegment.silent(duration=0)
    melody_ptr = 0
    current_duration = 0

    #emotion = os.path.basename(emotion)
    emotion = analyze_emotion(sentence)
    print(emotion)
    
    for rhythm_key in rhythm_lengths:
        segment_ms = int(note_durations[rhythm_key] * beat_ms *2)
        # ✅ 若情緒是悲傷→延長音符 1.5 倍
        if emotion == "SADNESS":
            segment_ms = segment_ms * 1.5

        segment_ms = int(segment_ms)
        
        # ⛔ 若加上這段會超過 16 秒，就結束
        if current_duration + segment_ms > TOTAL_DURATION_SEC * 1000:
            break
        
        rhythm_index = NOTE_KEYS.index(rhythm_key)

        # 🎵 7,8,9 -> 使用休止符，不消耗 melody_ptr
        if rhythm_index in [7, 3, 9]:
            segment = AudioSegment.silent(duration=segment_ms)
        #if rhythm_key.endswith("R"):  # 休止符處理
        #    rest_path = os.path.join(AUDIO_DIR, f"{rhythm_key}.wav")
        #    if os.path.exists(rest_path):
        #        segment = AudioSegment.from_wav(rest_path)
        #        segment = segment[:segment_ms]
        #    else:
        #        st.warning(f"⚠️ 找不到休止符音檔：{rest_path}")
        #        segment = AudioSegment.silent(duration=segment_ms)
        else:  # 音符處理
            if melody_ptr >= len(melody_notes):
                break

            note_name = melody_notes[melody_ptr]
            melody_ptr += 1

            emotion_dir = os.path.join(CHORD_DIR, emotion)
            note_path = os.path.join(emotion_dir, f"{note_name}.wav")

            print(note_name)

            if os.path.exists(note_path):
                segment = AudioSegment.from_wav(note_path)
                segment = segment[:segment_ms]
            else:
                segment = AudioSegment.silent(duration=segment_ms)
            
        if len(segment) > 20 and len(output) > 20:
            output = output.append(segment, crossfade=1)
        else:
            output += segment
            
        current_duration += segment_ms  # ✅ 記得加總時間
    # ✅ 新增：如果主旋律不滿 4 秒，於第 4.5 秒重播一次
    if current_duration <= 8000:
        padding_before = AudioSegment.silent(duration=8500 - current_duration)
        output = output + padding_before + output
        
        output = output.fade_out(250)
    
    if emotion == "SADNESS": 
        output = output.apply_gain(+6)
    if emotion == "JOY": 
        output = output.apply_gain(+1)
    if emotion == "CALM": 
        output = output.apply_gain(+6)
    if emotion == "SURPRISE": 
        output = output.apply_gain(+5)
    print(current_duration)
    return output, current_duration

