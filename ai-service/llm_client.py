"""
VendorIQ — LLM Abstraction Layer
=================================
Switch between Gemini and GPT by changing ONE env var:
  LLM_PROVIDER=gemini  → Google Gemini 1.5 Flash (default, free tier)
  LLM_PROVIDER=openai  → OpenAI GPT-4o-mini (requires OPENAI_API_KEY)

Zero code changes anywhere else in the codebase.
"""

import os
from abc import ABC, abstractmethod
from dotenv import load_dotenv

# Ensure env vars are loaded before singleton initialization
load_dotenv()


class LLMClient(ABC):
    """Abstract base — all LLM clients must implement complete()."""

    @abstractmethod
    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        pass


class GeminiClient(LLMClient):
    """
    Default — Google Gemini 1.5 Flash.
    Free tier: 15 requests/minute at aistudio.google.com
    Set GEMINI_API_KEY to use.
    """

    def __init__(self):
        import google.generativeai as genai
        api_key = os.environ.get("GEMINI_API_KEY")
        if not api_key:
            raise ValueError("GEMINI_API_KEY environment variable not set")
        genai.configure(api_key=api_key)
        self.model = genai.GenerativeModel(
            model_name="gemini-1.5-flash",
            generation_config={
                "temperature": 0.2,
                "max_output_tokens": 2048,
                "top_p": 0.95,
                "top_k": 40,
            },
            safety_settings=[
                {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_NONE"},
                {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_NONE"},
            ]
        )

    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        """
        Generate a completion. System prompt prepended to user message
        (Gemini does not have a separate system role in basic API).
        """
        prompt = f"{system}\n\n---\n\n{user}"
        response = self.model.generate_content(prompt)
        return response.text


class OpenAIClient(LLMClient):
    """
    Optional fallback. Set LLM_PROVIDER=openai + OPENAI_API_KEY to use.
    Model: gpt-4o-mini (cost-effective, fast).
    """

    def __init__(self):
        from openai import OpenAI
        api_key = os.environ.get("OPENAI_API_KEY")
        if not api_key:
            raise ValueError("OPENAI_API_KEY environment variable not set")
        self.client = OpenAI(api_key=api_key)

    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        response = self.client.chat.completions.create(
            model="gpt-4o-mini",
            temperature=temperature,
            max_tokens=2000,
            messages=[
                {"role": "system", "content": system},
                {"role": "user", "content": user},
            ],
        )
        return response.choices[0].message.content


class OllamaClient(LLMClient):
    """
    Local fallback — Ollama running Mistral 7B.
    Set LLM_PROVIDER=ollama to use (no API key needed).
    Requires: ollama serve + ollama pull mistral
    """

    def __init__(self):
        self.base_url = os.environ.get("OLLAMA_URL", "http://localhost:11434")
        self.model = os.environ.get("OLLAMA_MODEL", "mistral")

    def complete(self, system: str, user: str, temperature: float = 0.2) -> str:
        import httpx
        response = httpx.post(
            f"{self.base_url}/api/generate",
            json={
                "model": self.model,
                "prompt": f"{system}\n\n{user}",
                "temperature": temperature,
                "stream": False,
            },
            timeout=120.0,
        )
        response.raise_for_status()
        return response.json()["response"]


def get_llm_client() -> LLMClient:
    """
    Factory function — returns the correct LLM client based on LLM_PROVIDER env var.
    
    Usage in nodes:
        from llm_client import LLM
        result = LLM.complete(system_prompt, user_prompt)
    """
    provider = os.getenv("LLM_PROVIDER", "gemini").lower().strip()

    if provider == "openai":
        return OpenAIClient()
    elif provider == "ollama":
        return OllamaClient()
    elif provider == "gemini":
        return GeminiClient()
    else:
        raise ValueError(
            f"Unknown LLM_PROVIDER: '{provider}'. "
            f"Valid options: 'gemini' (default), 'openai', 'ollama'"
        )


# ─── Singleton — import this in all nodes ────────────────────────────────────
# Usage: from llm_client import LLM
LLM = get_llm_client()
