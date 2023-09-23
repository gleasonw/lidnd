from typing import Annotated, List, Optional, Dict, Tuple
import aiohttp
from dotenv import load_dotenv
import os
from fastapi.security import OAuth2PasswordBearer
from fastapi import BackgroundTasks, FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import class_row
from pydantic import BaseModel, NaiveDatetime
import asyncio
import discord
from discord import ApplicationContext
from datetime import datetime
from jinja2 import Environment, FileSystemLoader

load_dotenv()

env = Environment(loader=FileSystemLoader("."))
template = env.get_template("encounter.md")

CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

pool = AsyncConnectionPool(os.getenv("DATABASE_URL", default=""), open=False)
app = FastAPI()
origins = ["*"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")
bot = discord.Bot()


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


class EncounterOverview(EncounterResponse):
    participants: List[EncounterCreature]


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


class UserId(BaseModel):
    id: int


token_validation_cache: Dict[str, Tuple[datetime, DiscordUser]] = {}


async def post_encounter_to_user_channel(user_id: int, encounter_id: int):
    async with pool.connection() as conn:
        encounter = await get_encounter(encounter_id, UserId(id=user_id))
        encounter_creatures = await list_creatures(encounter_id, user_id)
        overview = EncounterOverview(
            **encounter.model_dump(), participants=encounter_creatures
        )
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT channel_id, message_id FROM channels WHERE user_id = %s",
                (user_id,),
            )
            ids = await cur.fetchone()
            if not ids:
                return
            channel_id, message_id = ids
            channel = bot.get_channel(channel_id)
            if not channel:
                return
            assert isinstance(
                channel, discord.TextChannel
            ), "Channel is not a text channel"
            rendered_md = template.render(overview=overview)
            if message_id:
                message = await channel.fetch_message(message_id)
                await message.edit(content=rendered_md)
            else:
                new_message = await channel.send(rendered_md)
                await cur.execute(
                    "UPDATE channels SET message_id = %s WHERE user_id = %s",
                    (new_message.id, user_id),
                )


@app.get("/")
def read_root():
    return {"Hello": "World"}


async def get_discord_user(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> DiscordUser:
    if token in token_validation_cache:
        (last_validated, user) = token_validation_cache[token]
        time_diff = datetime.now() - last_validated
        if time_diff.days < 1:
            return user
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://discord.com/api/users/@me",
            headers={"Authorization": f"Bearer {token}"},
        ) as resp:
            if resp.status == 200:
                user = DiscordUser(**await resp.json())
                token_validation_cache[token] = (datetime.now(), user)
                return user
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
async def next_turn(
    encounter_id: int, background_tasks: BackgroundTasks, user=Depends(get_discord_user)
) -> List[EncounterCreature]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterParticipant)) as curs:
            participants = await list_creatures(encounter_id, UserId(id=user.id))
            participants = [p for p in participants if p.hp > 0]
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
                RETURNING *
                """,
                (next_active.creature_id, current_active.creature_id, encounter_id),
            )
            background_tasks.add_task(
                post_encounter_to_user_channel, user.id, encounter_id
            )
            updated_participants = await curs.fetchall()
            if not updated_participants:
                raise HTTPException(
                    status_code=500, detail="Failed to update participants"
                )
    return await list_creatures(encounter_id)


@app.post("/api/encounters/{encounter_id}/previous_turn")
async def previous_turn(
    encounter_id: int, user=Depends(get_discord_user)
) -> List[EncounterCreature]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterParticipant)) as curs:
            participants = await list_creatures(encounter_id, UserId(id=user.id))
            participants = [p for p in participants if p.hp > 0]

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
    return await list_creatures(encounter_id)


@app.post("/api/encounters")
async def create_encounter(
    encounter_data: EncounterRequest,
    user=Depends(get_discord_user),
) -> EncounterResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute(
                "INSERT INTO encounters (user_id, name, description) VALUES (%s, %s, %s) RETURNING *",
                (user.id, encounter_data.name, encounter_data.description),
            )
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(
                    status_code=500, detail="Failed to create encounter"
                )
            return encounter


@app.put("/api/encounters/{encounter_id}")
async def update_encounter(
    encounter_id: int, encounter_data: EncounterRequest, user=Depends(get_discord_user)
) -> EncounterResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute(
                "UPDATE encounters SET name=%s, description=%s WHERE id=%s AND user_id=%s RETURNING *",
                (
                    encounter_data.name,
                    encounter_data.description,
                    encounter_id,
                    user.id,
                ),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
            updated_encounter = await cur.fetchone()
            if not updated_encounter:
                raise HTTPException(
                    status_code=500, detail="Failed to update encounter"
                )
            return updated_encounter


@app.put("/api/encounters/{encounter_id}/creatures/{creature_id}")
async def update_encounter_creature(
    encounter_id: int,
    creature_id: int,
    encounter_data: EncounterParticipant,
    user=Depends(get_discord_user),
) -> EncounterParticipant:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterParticipant)) as cur:
            await cur.execute(
                """
                UPDATE encounter_participants
                SET 
                    hp = CASE 
                        WHEN %s < 0 THEN 0
                        WHEN %s > (SELECT max_hp FROM creatures WHERE id = %s) THEN (SELECT max_hp FROM creatures WHERE id = %s)
                        ELSE %s
                    END,
                    initiative = %s
                WHERE encounter_id = %s AND creature_id = %s
                RETURNING *
                """,
                (
                    encounter_data.hp,
                    encounter_data.hp,
                    creature_id,
                    creature_id,
                    encounter_data.hp,
                    encounter_data.initiative,
                    encounter_id,
                    creature_id,
                ),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
            updated_creature = await cur.fetchone()
            if not updated_creature:
                raise HTTPException(status_code=500, detail="Failed to update creature")
            return updated_creature


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
async def start_encounter(
    encounter_id: int, user=Depends(get_discord_user)
) -> EncounterResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute(
                """
                WITH ActiveCreature AS (
                    SELECT creature_id
                    FROM encounter_participants
                    WHERE encounter_id = %s
                    ORDER BY initiative ASC
                    LIMIT 1
                )
                UPDATE encounters
                SET started_at = CURRENT_TIMESTAMP,
                    active_creature_id = (SELECT creature_id FROM ActiveCreature)
                WHERE id = %s 
                AND user_id = %s
                AND started_at IS NULL;
                RETURNING *
                """,
                (encounter_id, encounter_id, user.id),
            )

            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(status_code=500, detail="Failed to start encounter")
            return encounter


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
) -> CreatureResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(CreatureResponse)) as cur:
            # First, ensure the encounter belongs to the user
            await cur.execute(
                "SELECT id FROM encounters WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            encounter = await cur.fetchone()
            if not encounter:
                raise HTTPException(status_code=404, detail="Encounter not found")

            # Create the new creature
            await cur.execute(
                "INSERT INTO creatures (user_id, name, icon, stat_block, max_hp) VALUES (%s, %s, %s, %s, %s) RETURNING *",
                (
                    user.id,
                    creature.name,
                    creature.icon,
                    creature.stat_block,
                    creature.max_hp,
                ),
            )
            new_creature = await cur.fetchone()
            if not new_creature:
                raise HTTPException(status_code=500, detail="Failed to create creature")

            # Create a link between the encounter and the creature
            await cur.execute(
                "INSERT INTO encounter_participants (encounter_id, creature_id, hp, initiative) VALUES (%s, %s, %s, %s)",
                (encounter_id, new_creature.id, creature.max_hp, 0),
            )
            return new_creature


@app.put("/api/creatures/{creature_id}")
async def update_creature(
    creature_id: int,
    creature: CreatureRequest,
    user=Depends(get_discord_user),
) -> CreatureResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(CreatureResponse)) as cur:
            await cur.execute(
                "UPDATE creatures SET name=%s, max_hp=%s, icon=%s, stat_block=%s WHERE id=%s AND user_id=%s RETURNING *",
                (
                    creature.name,
                    creature.max_hp,
                    creature.icon,
                    creature.stat_block,
                    creature_id,
                    user.id,
                ),
            )
            updated_creature = await cur.fetchone()
            if not updated_creature:
                raise HTTPException(status_code=404, detail="Creature not found")
            return updated_creature


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
                ORDER BY initiative ASC
                """,
                (encounter_id,),
            )
            return await cur.fetchall()


@bot.event
async def on_ready():
    print(f"{bot.user} is ready and online!")


@bot.slash_command(
    name="track-here", description="Make this channel the encounter-tracking channel."
)
async def setup(ctx: ApplicationContext):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "INSERT INTO channels (channel_id, user_id) VALUES (%s, %s)",
                (ctx.channel_id, ctx.author.id),
            )
            await ctx.respond(
                "Your encounters from LiDnD will be posted here from now on."
            )


token = os.getenv("BOT_TOKEN")
assert token is not None, "BOT_TOKEN environment variable is not set"
asyncio.create_task(bot.start(token))
