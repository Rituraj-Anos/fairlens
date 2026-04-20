from dotenv import load_dotenv
import os
import google.generativeai as genai

load_dotenv()

key = os.getenv("GEMINI_API_KEY")
assert key, "❌ GEMINI_API_KEY not found in .env"
assert key.startswith("AIza"), "❌ Invalid key format"

genai.configure(api_key=key)
model = genai.GenerativeModel(os.getenv("GEMINI_MODEL", "gemini-2.0-flash-exp"))
response = model.generate_content("Say 'FairLens is ready' in exactly 3 words.")
print(f"✅ Gemini responded: {response.text}")
