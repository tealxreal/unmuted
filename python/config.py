import os

EMOTIONS = ["JOY", "ANGER", "SADNESS", "CALM", "FEAR", "SURPRISE"]

# 基礎資料夾
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CHORD_DIR = os.path.join(BASE_DIR, "chord_note_test")

CHORDS_MAP = {
    "JOY": ["A", "Bm", "C#m", "D", "E", "F#m", "G#dim"],
    "ANGER": ["B", "C#m", "D#m", "E", "F#", "G#m", "A#dim"],
    "SADNESS": ["D#m", "E#dim", "F#", "G#m", "A#m", "B", "C#"],
    "CALM": ["C", "Dm", "Em", "F", "G", "Am", "Bdim"],
    "FEAR": ["F", "Gm", "Am", "Bb", "C", "Dm", "Edim"],
    "SURPRISE": ["G", "Am", "Bm", "C", "D", "Em", "F#dim"],
}

SINGLE_MAP = {
    "JOY": ["s.E", "s.F#", "s.G#", "s.A", "s.B", "s.C#", "s.D#"],
    "ANGER": ["s.G#", "s.A#", "s.B", "s.C#", "s.D#", "s.E", "s.F#"],
    "SADNESS": ["s.Eb", "s.F", "s.Gb", "s.Ab", "s.Bb", "s.Cb", "s.Db"],
    "CALM": ["s.A", "s.B", "s.C", "s.D", "s.E", "s.F", "s.G"],
    "FEAR": ["s.D", "s.E", "s.F", "s.G", "s.A", "s.Bb", "s.C"],
    "SURPRISE": ["s.E", "s.F#", "s.G", "s.A", "s.B", "s.C", "s.D"],
}

def get_emotion_path(emotion: str) -> str:
    if emotion not in EMOTIONS:
        raise ValueError(f"Unknown emotion: {emotion}")
    return os.path.join(CHORD_DIR, emotion)

def get_chords(emotion: str):
    return CHORDS_MAP[emotion]

def get_single_notes(emotion: str):
    return SINGLE_MAP[emotion]