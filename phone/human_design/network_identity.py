"""Use the supplied social server's signed-in member identity."""
from fastapi import Depends, HTTPException, Request
import httpx
import os


def social_service_url():
    return os.getenv("SYNTHIA_SOCIAL_URL", "http://127.0.0.1:8787").rstrip("/")



async def optional_network_identity(request: Request):
    if not request.cookies.get("resonance_session"):
        return None
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            response = await client.get(social_service_url() + "/api/auth/me",
                                        headers={"Cookie": request.headers.get("cookie", "")})
        if response.status_code >= 500:
            raise HTTPException(status_code=503, detail="The member service is unavailable.")
        member = response.json().get("user") if response.status_code == 200 else None
    except (httpx.RequestError, ValueError) as exc:
        raise HTTPException(status_code=503, detail="The member service is unavailable.") from exc
    return member


async def network_identity(member: dict | None = Depends(optional_network_identity)):
    if not member:
        raise HTTPException(status_code=401, detail="Sign in to the Computer & Network to connect with members.")
    return member
