import os
import google.generativeai as genai
from dotenv import load_dotenv

load_dotenv()
api_key = os.getenv("GEMINI_API_KEY")

if not api_key:
    print("Error: GEMINI_API_KEY not found")
    exit(1)

genai.configure(api_key=api_key)

print("Listing all models...")
try:
    for m in genai.list_models():
        print(f"Name: {m.name}")
        print(f"Display Name: {m.display_name}")
        print(f"Supported methods: {m.supported_generation_methods}")
        print("-" * 20)
except Exception as e:
    print(f"Error: {e}")
