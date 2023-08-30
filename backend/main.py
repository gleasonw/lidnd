import aiohttp
from dotenv import load_dotenv
import os

from fastapi import FastAPI

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")


app = FastAPI()


@app.get("/")
def read_root():
    return {"Hello": "World"}


@app.post("/api/encounter/create")
async def create_encounter():
    pass


@app.get("/api/encounter/{id}")
async def get_encounter(id: int):
    pass


@app.get("/api/encounter/list")
async def list_encounters(token: str):
    if not await validate_token(token):
        return {"error": "Invalid token"}
    return {"encounters": ["hello"]}


@app.post("/api/encounter/update")
async def update_encounter():
    pass


async def validate_token(token: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            if resp.status == 200:
                return await resp.json()
            else:
                return False
