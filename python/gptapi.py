# gpt_service.py
import os
from dotenv import load_dotenv
from openai import OpenAI

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

def analyze_emotion(sentence: str) -> str:
    try:
        prompt = f"""
你是一個為藝術互動裝置服務的情緒分析系統，請依以下順序：ANGER-SURPRISE-FEAR-JOY-SADNESS-CALM進行篩選，判斷下列文字最接近哪一種情緒：
判斷原則：依據句子中隱含的情緒做分類。
其他規則：表達思念、想念的內容屬於SADNESS、情緒展現強度不高的句子歸類於CALM、若句子屬於直述句，依句子中詞彙的氛圍適當分配。
句字中含期待、期望、希望、驚喜、高度正向、浪漫則歸類SURPRISE。

只回傳其中一個英文單字：JOY/ANGER/SADNESS/CALM/FEAR/SURPRISE

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