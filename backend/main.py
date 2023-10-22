from typing import Annotated, Any, List, Literal, Optional, Dict, Tuple
import aiohttp
from dotenv import load_dotenv
import os
from fastapi.security import OAuth2PasswordBearer
from fastapi import (
    BackgroundTasks,
    FastAPI,
    Form,
    HTTPException,
    Depends,
    UploadFile,
)
from fastapi.middleware.cors import CORSMiddleware
from psycopg_pool import AsyncConnectionPool
from psycopg.rows import class_row
from pydantic import BaseModel, NaiveDatetime
import asyncio
import discord
from discord import ApplicationContext
from datetime import datetime
from jinja2 import Environment, FileSystemLoader
import boto3

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
    icon: UploadFile
    stat_block: UploadFile
    max_hp: int


class CreatureResponse(BaseModel):
    id: int
    name: str
    max_hp: int


class EncounterParticipant(BaseModel):
    id: int
    creature_id: int
    encounter_id: int
    hp: int
    initiative: int
    is_active: bool


class EncounterCreature(EncounterParticipant):
    name: str
    max_hp: int


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
        encounter = await get_user_encounter_by_id(encounter_id, UserId(id=user_id))
        encounter_creatures = await get_encounter_creatures(encounter_id)
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
            discord_settings = await get_discord_settings(UserId(id=user_id))
            channel_id, message_id = ids
            channel = bot.get_channel(channel_id)
            if not channel:
                return
            assert isinstance(
                channel, discord.TextChannel
            ), "Channel is not a text channel"
            print(overview)
            rendered_md = template.render(
                overview=overview,
                settings=discord_settings,
            )
            if message_id:
                try:
                    message = await channel.fetch_message(message_id)
                    await message.edit(content=rendered_md)
                except discord.NotFound:
                    new_message = await channel.send(rendered_md)
                    await cur.execute(
                        "UPDATE channels SET message_id = %s WHERE user_id = %s",
                        (new_message.id, user_id),
                    )
            else:
                new_message = await channel.send(rendered_md)
                await cur.execute(
                    "UPDATE channels SET message_id = %s WHERE user_id = %s",
                    (new_message.id, user_id),
                )


@app.get("/")
def read_root():
    return {"Hello": "World"}


whitelist = {"merkelizer"}


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
                if user.username not in whitelist:
                    raise HTTPException(status_code=403, detail="User not whitelisted")
                token_validation_cache[token] = (datetime.now(), user)
                return user
            else:
                print(await resp.text())
                raise HTTPException(status_code=401, detail="Invalid token")


@app.get("/api/encounters")
async def get_user_encounters(
    user=Depends(get_discord_user),
) -> List[EncounterResponse]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute("SELECT * FROM encounters WHERE user_id = %s", (user.id,))
            return await cur.fetchall()


@app.get("/api/encounters/{encounter_id}")
async def get_user_encounter_by_id(
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


@app.post("/api/encounters/{encounter_id}/turn")
async def update_turn(
    encounter_id: int,
    background_tasks: BackgroundTasks,
    to: Literal["next", "previous"],
    user=Depends(get_discord_user),
) -> List[EncounterCreature]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterParticipant)) as curs:
            participants = await get_encounter_creatures(encounter_id)
            current_active = [p for p in participants if p.is_active]
            if len(current_active) == 0:
                current_active = [p for p in participants if p.hp > 0]
            current_active = current_active[0]
            active_participants = [
                p
                for p in participants
                if p.hp > 0 or p.creature_id == current_active.creature_id
            ]

            if not active_participants:
                raise HTTPException(
                    status_code=500,
                    detail="Encounter not found, or no participants",
                )

            if to == "next":
                next_active = active_participants[
                    (active_participants.index(current_active) + 1)
                    % len(active_participants)
                ]
            else:
                next_active = active_participants[
                    (active_participants.index(current_active) - 1)
                    % len(active_participants)
                ]
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
    return await get_encounter_creatures(encounter_id)


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
    background_tasks: BackgroundTasks,
    user=Depends(get_discord_user),
) -> List[EncounterCreature]:
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
            background_tasks.add_task(
                post_encounter_to_user_channel, user.id, encounter_id
            )
    return await get_encounter_creatures(encounter_id)


@app.delete("/api/encounters/{encounter_id}")
async def delete_encounter(
    encounter_id: int, user=Depends(get_discord_user)
) -> List[EncounterResponse]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM encounters WHERE id=%s AND user_id=%s",
                (encounter_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Encounter not found")
    return await get_user_encounters(UserId(id=user.id))


@app.post("/api/encounters/{encounter_id}/start")
async def start_encounter(
    encounter_id: int, user=Depends(get_discord_user)
) -> EncounterResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterResponse)) as cur:
            await cur.execute(
                """
                UPDATE encounters
                SET started_at = CURRENT_TIMESTAMP
                WHERE id = %s 
                AND user_id = %s
                AND started_at IS NULL
                RETURNING *
                """,
                (encounter_id, user.id),
            )
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


@app.post("/api/encounters/{encounter_id}/creatures/{creature_id}")
async def add_existing_creature_to_encounter(
    encounter_id: int, creature_id: int, user=Depends(get_discord_user)
) -> List[EncounterCreature]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            async with asyncio.TaskGroup() as tg:
                user_encounter = tg.create_task(
                    get_user_encounter_by_id(encounter_id, user)
                )
                user_creature = tg.create_task(get_user_creature(creature_id, user))
            user_encounter = user_encounter.result()
            user_creature = user_creature.result()
            await cur.execute(
                "INSERT INTO encounter_participants (encounter_id, creature_id, hp, initiative, is_active) VALUES (%s, %s, %s, %s, %s)",
                (encounter_id, creature_id, user_creature.max_hp, 0, False),
            )
    return await get_encounter_creatures(encounter_id)


@app.post("/api/encounters/{encounter_id}/creatures")
async def add_creature_to_encounter(
    encounter_id: int,
    name: Annotated[str, Form()],
    max_hp: Annotated[int, Form()],
    icon: Annotated[UploadFile, Form()],
    stat_block: Annotated[UploadFile, Form()],
    user=Depends(get_discord_user),
) -> List[EncounterCreature]:
    if icon.content_type not in ["image/png"] or stat_block.content_type not in [
        "image/png"
    ]:
        raise HTTPException(status_code=400, detail="Icon must be a JPEG or PNG file")

    async with pool.connection() as conn:
        # ensure the encounter belongs to the user, will throw
        await get_user_encounter_by_id(encounter_id, user)

        new_creature = await create_creature(
            name=name, max_hp=max_hp, icon=icon, stat_block=stat_block, user=user
        )

        async with conn.cursor() as cur:
            # Create a link between the encounter and the creature
            await cur.execute(
                "INSERT INTO encounter_participants (encounter_id, creature_id, hp, initiative, is_active) VALUES (%s, %s, %s, %s, %s)",
                (encounter_id, new_creature.id, max_hp, 0, False),
            )
    return await get_encounter_creatures(encounter_id)


@app.delete("/api/encounters/{encounter_id}/creatures/{creature_id}")
async def remove_creature_from_encounter(
    encounter_id: int, creature_id: int, user=Depends(get_discord_user)
) -> List[EncounterCreature]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            async with asyncio.TaskGroup() as tg:
                user_encounter = tg.create_task(
                    get_user_encounter_by_id(encounter_id, user)
                )
                user_creature = tg.create_task(get_user_creature(creature_id, user))
            if user_encounter.exception() or user_creature.exception():
                raise HTTPException(
                    status_code=404, detail="Encounter or creature not found"
                )

            # Delete the link between the encounter and the creature
            await cur.execute(
                "DELETE FROM encounter_participants WHERE encounter_id=%s AND creature_id=%s",
                (encounter_id, creature_id),
            )
    return await get_encounter_creatures(encounter_id)


@app.get("/api/creatures/{creature_id}")
async def get_user_creature(
    creature_id: int, user=Depends(get_discord_user)
) -> CreatureResponse:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(CreatureResponse)) as cur:
            await cur.execute(
                "SELECT * FROM creatures WHERE id = %s AND user_id = %s",
                (creature_id, user.id),
            )
            creature = await cur.fetchone()
            if not creature:
                raise HTTPException(status_code=404, detail="Creature not found")
            return creature


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


@app.post("/api/creatures")
async def create_creature(
    name: Annotated[str, Form()],
    max_hp: Annotated[int, Form()],
    icon: Annotated[UploadFile, Form()],
    stat_block: Annotated[UploadFile, Form()],
    user=Depends(get_discord_user),
) -> CreatureResponse:
    if icon.content_type not in ["image/png"] or stat_block.content_type not in [
        "image/png"
    ]:
        raise HTTPException(status_code=400, detail="Icon must be a JPEG or PNG file")

    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(CreatureResponse)) as cur:
            await cur.execute(
                """
                WITH creature_count AS (
                SELECT COUNT(*) FROM creatures WHERE user_id = %s
                ), insert_creature AS (
                INSERT INTO creatures (user_id, name, max_hp)
                SELECT %s, %s, %s
                WHERE (SELECT COUNT(*) FROM creature_count) < 30
                RETURNING *
                )
                SELECT * FROM insert_creature;
                """,
                (
                    user.id,
                    user.id,
                    name,
                    max_hp,
                ),
            )
            new_creature = await cur.fetchone()
            if not new_creature:
                raise HTTPException(status_code=500, detail="Failed to create creature")

            s3 = boto3.resource(
                "s3",
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            )
            bucket = s3.Bucket(os.getenv("AWS_BUCKET_NAME"))

            bucket.put_object(Key=f"icon-{new_creature.id}.png", Body=icon.file)
            bucket.put_object(
                Key=f"stat_block-{new_creature.id}.png", Body=stat_block.file
            )
            return new_creature


@app.delete("/api/creatures/{creature_id}")
async def delete_creature(
    creature_id: int, user=Depends(get_discord_user)
) -> List[CreatureResponse]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM creatures WHERE id=%s AND user_id=%s",
                (creature_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Creature not found")
    return await get_user_creatures(user=user)


@app.get("/api/creatures")
async def get_user_creatures(
    name: Optional[str] = None,
    filter_encounter: Optional[int] = None,
    user=Depends(get_discord_user),
) -> List[CreatureResponse]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(CreatureResponse)) as cur:
            params = [user.id]
            filter_clause = ""
            if name and filter_encounter:
                filter_clause = "AND name ILIKE %s AND id NOT IN (SELECT creature_id FROM encounter_participants WHERE encounter_id = %s)"
                params.append(f"%{name}%")
                params.append(filter_encounter)
            elif name:
                filter_clause = "AND name ILIKE %s"
                params.append(f"%{name}%")
            elif filter_encounter:
                filter_clause = "AND id NOT IN (SELECT creature_id FROM encounter_participants WHERE encounter_id = %s)"
                params.append(filter_encounter)
            await cur.execute(
                f"SELECT * FROM creatures WHERE user_id = %s {filter_clause}", params
            )
            return await cur.fetchall()


@app.get("/api/encounters/{encounter_id}/creatures")
async def get_encounter_creatures(
    encounter_id: int, user=Depends(get_discord_user)
) -> List[EncounterCreature]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(EncounterCreature)) as cur:
            await cur.execute(
                """
            SELECT * FROM creatures 
            JOIN encounter_participants ON creatures.id = encounter_participants.creature_id 
            WHERE encounter_id = %s 
            ORDER BY initiative ASC, creature_id ASC
            """,
                (encounter_id,),
            )
            return await cur.fetchall()


class DiscordTextChannel(BaseModel):
    id: int
    name: str
    members: List[str]
    guild: str


@app.get("/api/discord-channel")
async def get_discord_channel(user=Depends(get_discord_user)) -> DiscordTextChannel:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT channel_id FROM channels WHERE user_id = %s",
                (user.id,),
            )
            channel_id = await cur.fetchone()
            if not channel_id:
                raise HTTPException(status_code=404, detail="Discord channel not found")
            channel_id = channel_id[0]
            channel = bot.get_channel(channel_id)
            assert isinstance(
                channel, discord.TextChannel
            ), "Channel is not a text channel"
            return DiscordTextChannel(
                id=channel.id,
                name=channel.name,
                members=[member.name for member in channel.members],
                guild=channel.guild.name,
            )


class DiscordEncounterSettings(BaseModel):
    show_health: bool
    show_icons: bool


@app.get("/api/discord-settings")
async def get_discord_settings(
    user=Depends(get_discord_user),
) -> DiscordEncounterSettings:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(DiscordEncounterSettings)) as cur:
            await cur.execute(
                "SELECT show_health, show_icons FROM discord_settings WHERE user_id = %s",
                (user.id,),
            )
            settings = await cur.fetchone()
            if not settings:
                raise HTTPException(
                    status_code=404, detail="Discord settings not found"
                )

            return settings


@app.put("/api/discord-settings")
async def update_discord_settings(
    settings: DiscordEncounterSettings, user=Depends(get_discord_user)
) -> None:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
            INSERT INTO discord_settings (user_id, show_health, show_icons) 
            VALUES (%s, %s, %s) 
            ON CONFLICT (user_id) 
            DO UPDATE SET show_health = EXCLUDED.show_health, show_icons = EXCLUDED.show_icons
            """,
                (user.id, settings.show_health, settings.show_icons),
            )


@bot.event
async def on_ready():
    print(f"{bot.user} is ready and online!")


@bot.slash_command(
    name="track", description="Make this channel the encounter-tracking channel."
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


@bot.slash_command(
    name="untrack", description="Stop posting encounters to this channel."
)
async def untrack(ctx: ApplicationContext):
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM channels WHERE channel_id = %s", (ctx.channel_id,)
            )
            await ctx.respond("This channel will no longer receive encounters.")


token = os.getenv("BOT_TOKEN")
assert token is not None, "BOT_TOKEN environment variable is not set"
asyncio.create_task(bot.start(token))
