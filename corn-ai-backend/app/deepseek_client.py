"""
DeepSeek API Client
-------------------
Wraps the DeepSeek chat-completions endpoint for agricultural diagnosis.
"""

from __future__ import annotations

import httpx

from app.config import settings
from app.logger import app_logger

# ─── Prompt Template ──────────────────────────────────────────────────────────

DIAGNOSIS_PROMPT_TEMPLATE = """\
You are a professional agricultural expert specializing in corn (maize) diseases.

A corn plant disease has been detected: **{disease_name}**
{confidence_line}
{context_line}

Please provide a comprehensive diagnosis report covering the following:

1. **Symptom Description**
   Describe the visible symptoms associated with this disease on corn plants.

2. **Causes of Infection**
   Explain the pathogen(s), environmental conditions, and transmission pathways.

3. **Recommended Treatment Methods**
   Provide actionable treatment steps the farmer should take immediately.

4. **Suggested Pesticides / Fungicides / Bactericides**
   List specific commercial products or active ingredients with application guidance.

5. **Preventive Measures**
   Describe long-term agronomic practices to prevent recurrence.

Be concise, practical, and farmer-friendly. Use metric units where applicable.\
"""


def _build_prompt(disease_name: str, confidence: float | None, additional_context: str | None) -> str:
    confidence_line = (
        f"Detection confidence: {confidence:.1%}" if confidence is not None else ""
    )
    context_line = (
        f"Additional context: {additional_context}" if additional_context else ""
    )
    return DIAGNOSIS_PROMPT_TEMPLATE.format(
        disease_name=disease_name,
        confidence_line=confidence_line,
        context_line=context_line,
    )


# ─── Client ───────────────────────────────────────────────────────────────────

class DeepSeekClient:
    """Async HTTP client for the DeepSeek chat-completions API."""

    def __init__(self):
        self._base_url = settings.DEEPSEEK_BASE_URL
        self._api_key  = settings.DEEPSEEK_API_KEY
        self._model    = settings.DEEPSEEK_MODEL
        self._timeout  = settings.DEEPSEEK_TIMEOUT

    # ──────────────────────────────────────────────────────────────────────────

    def _headers(self) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {self._api_key}",
            "Content-Type": "application/json",
        }

    def _payload(self, prompt: str) -> dict:
        return {
            "model": self._model,
            "messages": [{"role": "user", "content": prompt}],
            "max_tokens": settings.DEEPSEEK_MAX_TOKENS,
            "temperature": settings.DEEPSEEK_TEMPERATURE,
        }

    # ──────────────────────────────────────────────────────────────────────────

    async def get_diagnosis(
        self,
        disease_name: str,
        confidence: float | None = None,
        additional_context: str | None = None,
    ) -> str:
        """
        Call DeepSeek and return the diagnosis text.
        Raises RuntimeError on API failure.
        """
        if not self._api_key or self._api_key == "YOUR_DEEPSEEK_API_KEY":
            raise RuntimeError(
                "DeepSeek API key is not configured. "
                "Set the DEEPSEEK_API_KEY environment variable."
            )

        prompt  = _build_prompt(disease_name, confidence, additional_context)
        payload = self._payload(prompt)

        app_logger.info(f"Sending diagnosis request for disease: '{disease_name}'")

        async with httpx.AsyncClient(timeout=self._timeout) as client:
            try:
                response = await client.post(
                    f"{self._base_url}/chat/completions",
                    headers=self._headers(),
                    json=payload,
                )
                response.raise_for_status()
            except httpx.TimeoutException:
                app_logger.error("DeepSeek request timed out.")
                raise RuntimeError("Diagnosis request timed out. Please try again.")
            except httpx.HTTPStatusError as exc:
                app_logger.error(f"DeepSeek API error {exc.response.status_code}: {exc.response.text}")
                raise RuntimeError(
                    f"DeepSeek API returned status {exc.response.status_code}: {exc.response.text}"
                )
            except httpx.RequestError as exc:
                app_logger.error(f"DeepSeek connection error: {exc}")
                raise RuntimeError(f"Could not reach DeepSeek API: {exc}")

        data = response.json()

        try:
            diagnosis_text = data["choices"][0]["message"]["content"]
        except (KeyError, IndexError) as exc:
            app_logger.error(f"Unexpected DeepSeek response structure: {data}")
            raise RuntimeError(f"Unexpected response from DeepSeek: {exc}") from exc

        app_logger.info("Diagnosis received successfully.")
        return diagnosis_text


# Module-level singleton
deepseek_client = DeepSeekClient()
