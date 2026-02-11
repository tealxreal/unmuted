from fastapi import FastAPI
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from main_test import generate_music
from gptapi import analyze_emotion
from pydantic import BaseModel
import asyncio
import time

app = FastAPI()
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "frontend")
OUTPUT_DIR = os.path.join(PROJECT_ROOT, "output")
app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)

@app.get("/")
async def read_index():
    index_path = os.path.join(FRONTEND_DIR, "index.html")
    if os.path.exists(index_path):
        return FileResponse(index_path)
    
class SentenceInput(BaseModel):
    sentence: str

class GenerateRequest(BaseModel):
    sentence: str

@app.post("/generate")
async def generate(req: GenerateRequest):
    try:
        sentence = req.sentence
        #CALM
        #JOY
        #SADNESS
        #FEAR
        #ANGER
        #SURPRISE
        emotion = analyze_emotion(sentence)
        print("GPTemotion:", emotion)
        audio_path = await generate_music(
            sentence=sentence,
            emotion=emotion,
        )

        if not os.path.exists(audio_path):
            raise RuntimeError("Audio file not generated")

        return FileResponse(
            audio_path,
            media_type="audio/wav",
            filename=os.path.basename(audio_path)
        )

    except Exception as e:
        print("ERROR:", e)
        print("GPT failed, fallback to CALM:", e)
        emotion = "CALM"
        raise
    
async def delete_old_files():
    while True:
        now = time.time()
        output_dir = os.path.join(BASE_DIR, "output")
        for filename in os.listdir(output_dir):
            file_path = os.path.join(output_dir, filename)
            if os.path.isfile(file_path):
                # 如果檔案超過24小時 (60秒 × 60分鐘 × 24小時)
                if now - os.path.getmtime(file_path) > 60 * 60 * 24:
                    os.remove(file_path)
                    print(f"Deleted old file: {file_path}")
        await asyncio.sleep(3600)  # 每小時掃一次

if __name__ == "__main__":
    loop = asyncio.get_event_loop()
    loop.create_task(delete_old_files())  # 啟動背景任務