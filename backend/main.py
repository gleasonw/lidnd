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
    is_active: bool


class EncounterCreature(CreatureResponse, EncounterParticipant):
    pass


class EncounterRequest(BaseModel):
    name: str
    description: str


class EncounterResponse(BaseModel):
    id: int
    name: Optional[str] = None
    description: Optional[str] = None
    started_at: Optional[NaiveDatetime] = None
    ended_at: Optional[NaiveDatetime] = None


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
async def list_encounters(user=Depends(get_discord_user)) -> List[EncounterResponse]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute("SELECT * FROM encounters WHERE user_id = %s", (user.id,))
            return await cur.fetchall()


@app.get("/api/encounters/{encounter_id}")
async def get_encounter(
    encounter_id: int, user=Depends(get_discord_user)
) -> EncounterResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute(
                "SELECT * FROM encounters WHERE id = %s AND user_id = %s",
                (encounter_id, user.id),
            )
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(status_code=404, detail="Encounter not found")
            return encounter


@app.post("/api/encounters/{encounter_id}/next_turn")
async def next_turn(encounter_id: int, user=Depends(get_discord_user)) -> None:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterParticipant)) as curs:
            await curs.execute(
                """
                    SELECT *
                    FROM encounter_participants
                    WHERE encounter_id = %s
                    ORDER BY initiative ASC
                    """,
                (encounter_id,),
            )
            participants = await curs.fetchall()
            if not participants:
                raise HTTPException(
                    status_code=404,
                    detail="Encounter not found, or no participants",
                )
            current_active = [p for p in participants if p.is_active]
            if len(current_active) == 0:
                raise HTTPException(
                    status_code=404, detail="No active participant found"
                )
            current_active = current_active[0]
            greater_initiatives = [
                p for p in participants if p.initiative > current_active.initiative
            ]
            if not greater_initiatives:
                equal_initiatives = [
                    p
                    for p in participants
                    if p.initiative == current_active.initiative
                    and p.creature_id != current_active.creature_id
                ]
                if not equal_initiatives:
                    next_active = participants[0]
                else:
                    next_active = equal_initiatives[0]
            else:
                next_active = greater_initiatives[0]
            await curs.execute(
                """
                    UPDATE encounter_participants
                    SET is_active = CASE 
                        WHEN creature_id = %s THEN TRUE
                        WHEN creature_id = %s THEN FALSE
                        ELSE is_active
                    END
                    WHERE encounter_id = %s
                    """,
                (next_active.creature_id, current_active.creature_id, encounter_id),
            )


@app.post("/api/encounters/{encounter_id}/previous_turn")
async def previous_turn(encounter_id: int, user=Depends(get_discord_user)) -> None:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterParticipant)) as curs:
            await curs.execute(
                """
                    SELECT *
                    FROM encounter_participants
                    WHERE encounter_id = %s
                    ORDER BY initiative DESC
                    """,
                (encounter_id,),
            )
            participants = await curs.fetchall()
            if not participants:
                raise HTTPException(
                    status_code=404,
                    detail="Encounter not found, or no participants",
                )
            current_active = [p for p in participants if p.is_active]
            if len(current_active) == 0:
                raise HTTPException(
                    status_code=404, detail="No active participant found"
                )
            current_active = current_active[0]
            lesser_initiatives = [
                p for p in participants if p.initiative < current_active.initiative
            ]

            if not lesser_initiatives:
                equal_initiatives = [
                    p
                    for p in participants
                    if p.initiative == current_active.initiative
                    and p.creature_id != current_active.creature_id
                ]
                if not equal_initiatives:
                    previous_active = participants[0]
                else:
                    previous_active = equal_initiatives[0]
            else:
                previous_active = lesser_initiatives[0]
            print(previous_active)
            await curs.execute(
                """
                    UPDATE encounter_participants
                    SET is_active = CASE 
                        WHEN creature_id = %s THEN TRUE
                        WHEN creature_id = %s THEN FALSE
                        ELSE is_active
                    END
                    WHERE encounter_id = %s
                    """,
                (
                    previous_active.creature_id,
                    current_active.creature_id,
                    encounter_id,
                ),
            )


@app.post("/api/encounters")
async def create_encounter(
    encounter_data: EncounterRequest, user=Depends(get_discord_user)
) -> EncounterResponse:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO encounters (user_id, name, description) VALUES (%s, %s, %s) RETURNING id",
                (user.id, encounter_data.name, encounter_data.description),
            )
            encounter_id = await cur.fetchone()
            if encounter_id is None:
                raise HTTPException(
                    status_code=500, detail="Failed to create encounter"
                )
            return EncounterResponse(id=encounter_id[0])


@app.put("/api/encounters/{encounter_id}")
async def update_encounter(
    encounter_id: int, encounter_data: EncounterRequest, user=Depends(get_discord_user)
) -> None:
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


@app.put("/api/encounters/{encounter_id}/creatures/{creature_id}")
async def update_encounter_creature(
    encounter_id: int,
    creature_id: int,
    encounter_data: EncounterParticipant,
    user=Depends(get_discord_user),
) -> None:
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


@app.delete("/api/encounters/{encounter_id}")
async def delete_encounter(encounter_id: int, user=Depends(get_discord_user)) -> None:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM encounters WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")


@app.post("/api/encounters/{encounter_id}/start")
async def start_encounter(encounter_id: int, user=Depends(get_discord_user)) -> None:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
                WITH ActiveCreature AS (
                    SELECT creature_id
                    FROM encounter_participants
                    WHERE encounter_id = %s
                    ORDER BY initiative DESC
                    LIMIT 1
                )
                UPDATE encounters
                SET started_at = CURRENT_TIMESTAMP,
                    active_creature_id = (SELECT creature_id FROM ActiveCreature)
                WHERE id = %s 
                AND user_id = %s
                AND started_at IS NULL;
                """,
                (encounter_id, encounter_id, user.id),
            )

            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")


@app.post("/api/encounters/{encounter_id}/stop")
async def stop_encounter(encounter_id: int, user=Depends(get_discord_user)) -> None:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "UPDATE encounters SET started=False WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")


@app.post("/api/encounters/{encounter_id}/creatures")
async def add_creature(
    encounter_id: int, creature: CreatureRequest, user=Depends(get_discord_user)
) -> None:
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


@app.put("/api/creatures/{creature_id}")
async def update_creature(
    creature_id: int,
    creature: CreatureRequest,
    user=Depends(get_discord_user),
) -> None:
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


@app.delete("/api/creatures/{creature_id}")
async def delete_creature(
    encounter_id: int, creature_id: int, user=Depends(get_discord_user)
) -> None:
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


@app.get("/api/encounters/{encounter_id}/creatures")
async def list_creatures(
    encounter_id: int, user=Depends(get_discord_user)
) -> List[EncounterCreature]:
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
            return await cur.fetchall()
