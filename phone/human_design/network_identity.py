"""Use the supplied social server's signed-in member identity."""
from fastapi import HTTPException, Request
import httpx
import os


def social_service_url():
    return os.getenv("SYNTHIA_SOCIAL_URL", "http://127.0.0.1:8787").rstrip("/")



async def network_identity(request: Request):
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(social_service_url() + "/api/auth/me",
                                        headers={"Cookie": request.headers.get("cookie", "")})
        member = response.json().get("user") if response.status_code == 200 else None
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="The member service is unavailable.") from exc
    if not member:
        raise HTTPException(status_code=401, detail="Sign in to the Computer & Network to connect with members.")
    return member
