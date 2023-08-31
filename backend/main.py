from typing import List
import aiohttp
from dotenv import load_dotenv
import os
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import class_row
from pydantic import BaseModel

from fastapi import FastAPI, HTTPException, Depends

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

pool = AsyncConnectionPool(os.getenv("DATABASE_URL", default=""), open=False)
app = FastAPI()


@app.on_event("startup")
async def open_pool():
    await pool.open()


@app.on_event("shutdown")
async def close_pool():
    await pool.close()


class Creature(BaseModel):
    name: str
    initiative: int
    icon: str


class Encounter(BaseModel):
    user: int
    name: str
    description: str
    started: bool
    creatures: List[Creature]


class DiscordUser(BaseModel):
    id: int
    username: str
    discriminator: str
    avatar: str
    mfa_enabled: bool
    locale: str
    flags: int
    premium_type: int
    public_flags: int


@app.get("/")
def read_root():
    return {"Hello": "World"}


async def get_discord_user(token: str):
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            if resp.status == 200:
                return DiscordUser(**await resp.json())
            else:
                raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/api/encounters")
async def list_encounters(token: str):
    user = await get_discord_user(token)
    print(user)
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(Encounter)) as cur:
            await cur.execute("SELECT * FROM encounters WHERE user_id = %s", (user.id,))
            return {"encounters": await cur.fetchall()}


@app.get("/api/encounters/{encounter_id}")
async def get_encounter(encounter_id: int, user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(Encounter)) as cur:
            await cur.execute(
                "SELECT * FROM encounters WHERE id = %s AND user_id = %s",
                (encounter_id, user.id),
            )
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(status_code=404, detail="Encounter not found")
            return {"encounter": encounter}


@app.post("/api/encounters")
async def create_encounter(encounter_data: Encounter, user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO encounters (user_id, name, description, started) VALUES (%s, %s, %s, %s) RETURNING id",
                (user.id, encounter_data.name, encounter_data.description, False),
            )
            encounter_id = await cur.fetchone()
            return {"encounter": {"id": encounter_id}}


@app.put("/api/encounters/{encounter_id}")
async def update_encounter(
    encounter_id: int, encounter_data: Encounter, user=Depends(get_discord_user)
):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE encounters SET name=%s, description=%s WHERE id=%s AND user_id=%s",
                (
                    encounter_data.name,
                    encounter_data.description,
                    encounter_id,
                    user.id,
                ),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
            return {"encounter": {"id": encounter_id, "updated": True}}


@app.delete("/api/encounters/{encounter_id}")
async def delete_encounter(encounter_id: int, user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM encounters WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
            return {"result": "Encounter deleted"}


@app.post("/api/encounters/{encounter_id}/start")
async def start_encounter(encounter_id: int, user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE encounters SET started=True WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
            return {"encounter": {"id": encounter_id, "started": True}}


@app.post("/api/encounters/{encounter_id}/stop")
async def stop_encounter(encounter_id: int, user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE encounters SET started=False WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
            return {"encounter": {"id": encounter_id, "stopped": True}}


@app.post("/api/encounters/{encounter_id}/creatures")
async def add_creature(
    encounter_id: int, creature: Creature, user=Depends(get_discord_user)
):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            # First, ensure the encounter belongs to the user
            await cur.execute(
                "SELECT id FROM encounters WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(status_code=404, detail="Encounter not found")

            # Insert the new creature
            await cur.execute(
                "INSERT INTO creatures (encounter_id, name, initiative, icon) VALUES (%s, %s, %s, %s) RETURNING id",
                (
                    encounter_id,
                    creature.name,
                    creature.initiative,
                    creature.icon,
                ),
            )
            creature_id = await cur.fetchone()
            return {"creature": {"id": creature_id}}
