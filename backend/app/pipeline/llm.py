import json

import groq

from app.config import GROQ_API_KEY

_client = groq.Groq(api_key=GROQ_API_KEY)

# Groq said "slow down" or couldn't be reached: worth trying again later.
_TRANSIENT = (groq.RateLimitError, groq.APIConnectionError, groq.APITimeoutError, groq.InternalServerError)


class LLMError(Exception):
    pass


class LLMBusy(LLMError):
    """Rate-limited (429), timed out or unreachable. The upload queue retries with backoff."""


def chat_json(model: str, system: str, user: str, retries: int = 1) -> dict:
    """Call Groq in JSON mode. Bad JSON is retried once right away. A rate limit (429) or
    outage is NOT retried here — hammering makes it worse — it raises LLMBusy so the upload
    queue can try again later with exponential backoff."""
    last: Exception | None = None
    for _ in range(retries + 1):
        try:
            resp = _client.chat.completions.create(
                model=model,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                response_format={"type": "json_object"},
                temperature=0,
            )
            return json.loads(resp.choices[0].message.content)
        except _TRANSIENT as e:
            raise LLMBusy(str(e)) from e
        except (groq.APIError, json.JSONDecodeError, TypeError) as e:
            last = e
    raise LLMError(str(last))
