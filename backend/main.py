from typing import Annotated, List, Optional
import aiohttp
from dotenv import load_dotenv
import os
from fastapi.security import OAuth2PasswordBearer
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import class_row
from pydantic import BaseModel, NaiveDatetime

from fastapi import FastAPI, HTTPException, Depends

load_dotenv()

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

pool = AsyncConnectionPool(os.getenv("DATABASE_URL", default=""), open=False)
app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")


@app.on_event("startup")
async def open_pool():
    await pool.open()


@app.on_event("shutdown")
async def close_pool():
    await pool.close()


class CreatureRequest(BaseModel):
    name: str
    icon: str
    stat_block: str
    max_hp: int


class CreatureResponse(CreatureRequest):
    id: int


class EncounterParticipant(BaseModel):
    creature_id: int
    encounter_id: int
    hp: int
    initiative: int


class EncounterCreature(CreatureResponse, EncounterParticipant):
    pass


class EncounterRequest(BaseModel):
    name: str
    description: str


class EncounterResponse(BaseModel):
    id: int
    name: str
    description: str
    started_at: Optional[NaiveDatetime] = None
    ended_at: Optional[NaiveDatetime] = None
    creatures: Optional[List[CreatureResponse]] = None


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


async def get_discord_user(token: Annotated[str, Depends(oauth2_scheme)]):
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
async def list_encounters(user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute("SELECT * FROM encounters WHERE user_id = %s", (user.id,))
            responses = await cur.fetchall()
            return {"encounters": responses}


@app.get("/api/encounters/{encounter_id}")
async def get_encounter(encounter_id: int, user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute(
                "SELECT * FROM encounters WHERE id = %s AND user_id = %s",
                (encounter_id, user.id),
            )
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(status_code=404, detail="Encounter not found")
            return {"encounter": encounter}


@app.post("/api/encounters")
async def create_encounter(
    encounter_data: EncounterRequest, user=Depends(get_discord_user)
):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO encounters (user_id, name, description) VALUES (%s, %s, %s) RETURNING id",
                (user.id, encounter_data.name, encounter_data.description),
            )
            encounter_id = await cur.fetchone()
            return {"encounter": {"id": encounter_id}}


@app.put("/api/encounters/{encounter_id}")
async def update_encounter(
    encounter_id: int, encounter_data: EncounterRequest, user=Depends(get_discord_user)
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


@app.put("/api/encounters/{encounter_id}/creatures/{creature_id}")
async def update_encounter_creature(
    encounter_id: int,
    creature_id: int,
    encounter_data: EncounterParticipant,
    user=Depends(get_discord_user),
):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                UPDATE encounter_participants 
                SET hp=%s, initiative=%s 
                WHERE encounter_id=%s AND creature_id=%s
                """,
                (
                    encounter_data.hp,
                    encounter_data.initiative,
                    encounter_id,
                    creature_id,
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
                """
                UPDATE encounters
                SET started_at = CURRENT_TIMESTAMP
                WHERE id = %s 
                AND user_id = %s
                AND started_at IS NULL;
                """,
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
    encounter_id: int, creature: CreatureRequest, user=Depends(get_discord_user)
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

            # Create the new creaturem
            await cur.execute(
                "INSERT INTO creatures (user_id, name, icon, stat_block, max_hp) VALUES (%s, %s, %s, %s, %s) RETURNING id",
                (
                    user.id,
                    creature.name,
                    creature.icon,
                    creature.stat_block,
                    creature.max_hp,
                ),
            )
            creature_id = await cur.fetchone()
            if not creature_id:
                raise HTTPException(status_code=500, detail="Failed to create creature")
            creature_id = creature_id[0]

            # Create a link between the encounter and the creature
            await cur.execute(
                "INSERT INTO encounter_participants (encounter_id, creature_id, hp, initiative) VALUES (%s, %s, %s, %s)",
                (encounter_id, creature_id, creature.max_hp, 0),
            )

            return {"creature": {"id": creature_id}}


@app.put("/api/creatures/{creature_id}")
async def update_creature(
    creature_id: int,
    creature: CreatureRequest,
    user=Depends(get_discord_user),
):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE creatures SET name=%s, max_hp=%s, icon=%s, stat_block=%s, WHERE id=%s AND user_id=%s",
                (
                    creature.name,
                    creature.max_hp,
                    creature.icon,
                    creature.stat_block,
                    creature_id,
                    user.id,
                ),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Creature not found")
            return {"creature": {"id": creature_id, "updated": True}}


@app.delete("/api/creatures/{creature_id}")
async def delete_creature(
    encounter_id: int, creature_id: int, user=Depends(get_discord_user)
):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT id FROM encounters WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(status_code=404, detail="Encounter not found")

            await cur.execute(
                "DELETE FROM creatures WHERE id=%s AND encounter_id=%s",
                (creature_id, encounter_id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Creature not found")
            return {"result": "Creature deleted"}


@app.get("/api/encounters/{encounter_id}/creatures")
async def list_creatures(encounter_id: int, user=Depends(get_discord_user)):
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterCreature)) as cur:
            await cur.execute(
                """
                SELECT * FROM creatures JOIN encounter_participants 
                ON creatures.id = encounter_participants.creature_id 
                WHERE encounter_id = %s
                """,
                (encounter_id,),
            )
            responses = await cur.fetchall()
            return {"creatures": responses}
