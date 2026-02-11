import os, math

from pydub import AudioSegment
from config import get_emotion_path
from gptapi import analyze_emotion

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHORD_DIR = os.path.join(BASE_DIR, "chord_note_test")

TOTAL_DURATION_SEC = 16
TOTAL_BEATS = 32
MIN_BEATS_PER_CHORD = 2
MAX_BEATS_PER_CHORD = 8

# 分配每個和弦的時長（拍數）
def distribute_beats(weights):
    total_weight = sum(weights)
    raw_beats = [w / total_weight * TOTAL_BEATS for w in weights]
    rounded_beats = [max(MIN_BEATS_PER_CHORD, min(MAX_BEATS_PER_CHORD, round(b))) for b in raw_beats]
    while sum(rounded_beats) > TOTAL_BEATS:
        max_i = rounded_beats.index(max(rounded_beats))
        if rounded_beats[max_i] > MIN_BEATS_PER_CHORD:
            rounded_beats[max_i] -= 1
    while sum(rounded_beats) < TOTAL_BEATS:
        min_i = rounded_beats.index(min(rounded_beats))
        if rounded_beats[min_i] < MAX_BEATS_PER_CHORD:
            rounded_beats[min_i] += 1
    print(rounded_beats)
    return rounded_beats


# 和弦音檔
def combine_audio(chords, beat_durations, sentence: str):

    #emotion = os.path.basename(emotion)
    emotion = analyze_emotion(sentence)

    emotion_dir = os.path.join(CHORD_DIR, emotion)
    
    beat_duration_ms = (TOTAL_DURATION_SEC * 1000) / TOTAL_BEATS
    output = AudioSegment.silent(duration=0)
    for chord, beats in zip(chords, beat_durations):
        path = os.path.join(emotion_dir, f"{chord}.wav")
        if os.path.exists(path):
            segment = AudioSegment.from_wav(path)
            segment_duration = int(beats * beat_duration_ms)
            segment = segment[:segment_duration]
            output += segment
        
    output = output.apply_gain(-1)
    return output