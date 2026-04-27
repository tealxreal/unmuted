from fastapi import FastAPI
from fastapi import Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse
from fastapi.staticfiles import StaticFiles
import os
from .main_test import generate_music
from .gptapi import analyze_emotion
from pydantic import BaseModel
import asyncio
import time

app = FastAPI()
interaction_logs = []

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "https://unmuted-theta.vercel.app",
        "https://www.unmuted.tw",
        "https://unmuted.tw",
        "https://unmuted.onrender.com/",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
PROJECT_ROOT = os.path.abspath(os.path.join(BASE_DIR, ".."))
FRONTEND_DIR = os.path.join(PROJECT_ROOT, "public")
OUTPUT_DIR = os.path.join(BASE_DIR, "output")
os.makedirs(OUTPUT_DIR, exist_ok=True)
app.mount(
    "/static",
    StaticFiles(directory=FRONTEND_DIR),
    name="static"
)
app.mount(
    "/output",
    StaticFiles(directory=OUTPUT_DIR),
    name="output"
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
@app.get("/logs")

def get_logs():
    
    return interaction_logs

async def generate(req: GenerateRequest, request: Request):
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
        
        filename=os.path.basename(audio_path)
        audio_url = f"/output/{filename}"
        print(audio_url)

        # 👉 取得裝置資訊（user-agent）
        user_agent = request.headers.get("user-agent", "unknown")
        # 👉 存 log
        log = {
            time.strftime("%Y-%m-%d %H:%M:%S"),
            user_agent,
            sentence,
            emotion
        }
        interaction_logs.insert(0, log)
        interaction_logs[:] = interaction_logs[:250]
        return {
            "emotion": emotion,
            "audio_url": audio_url
        }    
    

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