import os, re
from pydub import AudioSegment
from pypinyin import pinyin, Style
from .melody_test import combine_melody_audio
from config import get_emotion_path

INITIALS = ['b', 'c', 'ch', 'd', 'f', 'g', 'h', 'j', 'k', 'l', 'm', 'n', 'p', 'q', 'r', 's', 'sh', 't', 'w', 'x', 'y', 'z', 'zh']
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
EFFECT_DIR = os.path.join(BASE_DIR, "effect_test")

def get_effect_index(sentence):
    INITIALS = ['b', 'c', 'ch', 'd', 'f', 'g', 'h', 'j', 'k', 'l',
                'm', 'n', 'p', 'q', 'r', 's', 'sh', 't', 'w', 'x',
                'y', 'z', 'zh']
    ALPHABET = list("abcdefghijklmnopqrstuvwxyz")

    clean = ''.join([c for c in sentence if c not in "，。！？,.!? "])
    if not clean:
        return None
    first_char = clean[0].lower()
    if first_char in ALPHABET:
        base_index = ALPHABET.index(first_char)
        effect_index = (base_index + len(clean)) % len(ALPHABET)
        effect_index = effect_index % 4
        print("EN effect_index:", effect_index)
        return effect_index
    if re.match(r'[\u4e00-\u9fff]', first_char):
        pinyins = pinyin(clean, style=Style.INITIALS, strict=False)
        valid_initial = None
        for  py in pinyins:
            if not py:
                continue
            initial = py[0].lower()
            if initial and initial not in ["a", "e", "o", "u", ""]:
                valid_initial = initial
                break
        if valid_initial is None:
            return None
        try:
            base_index = INITIALS.index(valid_initial)
        except ValueError:
            return None

        effect_index = (base_index + len(clean)) % len(INITIALS)
        effect_index = effect_index % 4
        print("ZH effect_index:", effect_index)
        return effect_index
    
    return None


def insert_effect(melody_audio, sentence: str, raw_duration: int, melody_notes: list, rhythm_lengths: list, emotion: str) -> AudioSegment:

    emotion = os.path.basename(emotion)
    EFFECTFULL_DIR = os.path.join(EFFECT_DIR, emotion)
    melody_audio, raw_duration = combine_melody_audio(melody_notes, rhythm_lengths, emotion)
    effect_index = get_effect_index(sentence)

    if effect_index is None:
        return melody_audio

    #effect_key = INITIALS[effect_index]
    effect_files = sorted(
        [f for f in os.listdir(EFFECTFULL_DIR)],
        key=lambda x: INITIALS.index(x.split('_')[0]) if x.split('_')[0] in INITIALS else 999
    )
    effect_filename = effect_files[effect_index % len(effect_files)]
    
    effect_path = os.path.join(EFFECTFULL_DIR, effect_filename)
    print(effect_path)
    effect = AudioSegment.from_wav(effect_path)
    layered = melody_audio
    
    # Case 1：< 4000ms，5秒進入，播2秒
    if raw_duration < 4000:
        insert_time = 5000
        effect_cut = effect[:2000]
        effect_trimmed = effect_cut
        layered = layered.overlay(effect_trimmed, position=insert_time)

    # Case 2：4000~6000ms，2秒與6秒進入，各播1.5秒
    elif 4000 <= raw_duration < 6000:
        insert_times = [2000, 6000]
        first_cut = effect[:1500]
        second_cut = effect[1500:4000]
        for idx, t in enumerate(insert_times):
            trimmed = first_cut if idx == 0 else second_cut
            required_length = t + len(trimmed)
            if len(layered) < required_length:
                padding = AudioSegment.silent(duration=required_length - len(layered))
                layered += padding
            layered = layered.overlay(trimmed, position=t)

    # Case 3：≥ 6000ms，2秒進入，播3秒
    elif raw_duration >= 6000:
        insert_time = 2000
        effect_cut = effect[:3000]
        effect_trimmed = effect_cut
        layered = layered.overlay(effect_trimmed, position=insert_time)

    layered = layered.apply_gain(-8)
    return layered