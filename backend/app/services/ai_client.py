import os
import requests
from typing import Any, Dict, List, Optional


class AIClientError(Exception):
    pass


def _default_headers(api_key: Optional[str]) -> Dict[str, str]:
    headers = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = api_key
    return headers


def call_chat(
    messages: List[Dict[str, str]],
    model: Optional[str] = None,
    temperature: Optional[float] = None,
    max_tokens: Optional[int] = None,
    base_url: Optional[str] = None,
    api_key: Optional[str] = None,
    tools: Optional[list] = None,
) -> Dict[str, Any]:
    base = base_url or os.getenv("AI_BASE_URL") or "https://api.openai.com/v1"
    url = base.rstrip("/") + "/chat/completions"
    payload: Dict[str, Any] = {"model": model or os.getenv("AI_MODEL_NAME") or "gpt-4.1", "messages": messages}
    if temperature is not None:
        payload["temperature"] = temperature
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    if tools:
        payload["tools"] = tools
    try:
        resp = requests.post(url, json=payload, headers=_default_headers(api_key or os.getenv("AI_API_KEY")), timeout=10)
        resp.raise_for_status()
        return resp.json()
    except Exception as exc:
        raise AIClientError(str(exc))


def call_vision(



    file_bytes: bytes,



    filename: str,



    instructions: str,



    language: str = "fa",



    base_url: Optional[str] = None,



    api_key: Optional[str] = None,



) -> Dict[str, Any]:



    import base64



    base = base_url or os.getenv("AI_BASE_URL") or "https://api.openai.com/v1"



    url = base.rstrip("/") + "/chat/completions"







    base64_image = base64.b64encode(file_bytes).decode('utf-8')







    prompt = f"Analyze the attached image ({filename}) and follow these instructions in {language}: {instructions}"







    payload = {



        "model": os.getenv("AI_VISION_MODEL_NAME") or "gpt-4-vision-preview",



        "messages": [



            {



                "role": "user",



                "content": [



                    {



                        "type": "text",



                        "text": prompt



                    },



                    {



                        "type": "image_url",



                        "image_url": {



                            "url": f"data:image/jpeg;base64,{base64_image}"



                        }



                    }



                ]



            }



        ],



        "max_tokens": 2000



    }



    try:



        resp = requests.post(url, json=payload, headers=_default_headers(api_key or os.getenv("AI_API_KEY")), timeout=30)



        resp.raise_for_status()



        return resp.json()



    except Exception as exc:



        raise AIClientError(str(exc))
