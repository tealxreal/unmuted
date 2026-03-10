# gpt_service.py
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_emotion(sentence: str) -> str:
    try:
        prompt = f"""
你是一個為藝術互動裝置服務的情緒分析系統，請依據文字中隱含的情緒做分類。
只需要回傳其中一個英文單字：JOY/ANGER/SADNESS/CALM/FEAR/SURPRISE
其他規則：若文字的情緒不明顯仍以CALM之外的選項優先考慮，句子真的屬於沒有形容詞的句子才歸類為CALM。

文字：
「{sentence}」
"""
        response = client.responses.create(
        model="gpt-4o-mini",
        input=prompt,
        temperature=0
        )
        return response.output_text.strip().upper()
    
    except Exception as e:
        print("GPT failed:", e)
        return "CALM"