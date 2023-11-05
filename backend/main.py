from typing import Annotated, Any, List, Literal, Optional, Dict, Tuple, Set
import aiohttp
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager
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


@asynccontextmanager
async def lifespan(app: FastAPI):
    await pool.open()
    token = os.getenv("BOT_TOKEN")
    assert token is not None, "BOT_TOKEN environment variable is not set"
    asyncio.create_task(bot.start(token))

    yield

    await pool.close()


app = FastAPI(lifespan=lifespan)
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


class Id(BaseModel):
    id: int


class Creature(Id):
    name: str
    max_hp: int
    challenge_rating: float
    is_player: bool = False


class EncounterParticipant(Id):
    creature_id: int
    encounter_id: int
    hp: int
    initiative: int
    is_active: bool


class EncounterCreature(EncounterParticipant, Creature):
    pass


class EncounterRequest(BaseModel):
    name: str
    description: str


class EncounterResponse(Id):
    name: Optional[str] = None
    description: Optional[str] = None
    started_at: Optional[NaiveDatetime] = None
    ended_at: Optional[NaiveDatetime] = None


class DiscordUser(BaseModel):
    id: int
    username: str
    locale: str
    flags: int
    premium_type: int
    public_flags: int


class UserId(BaseModel):
    id: int


token_validation_cache: Dict[str, Tuple[datetime, DiscordUser]] = {}


async def post_encounter_to_user_channel(user_id: int, encounter_id: int):
    start_time = datetime.now()
    async with pool.connection() as conn:
        async with asyncio.TaskGroup() as tg:
            encounter = tg.create_task(
                get_user_encounter_by_id(encounter_id, UserId(id=user_id))
            )
            channel_info = tg.create_task(get_discord_channel(UserId(id=user_id)))
            discord_settings = tg.create_task(get_settings(UserId(id=user_id)))
        encounter = encounter.result()
        channel_info = channel_info.result()
        discord_settings = discord_settings.result()
        channel = bot.get_channel(channel_info.id)
        if not channel:
            return
        assert isinstance(channel, discord.TextChannel), "Channel is not a text channel"
        rendered_md = template.render(
            overview=encounter,
            settings=discord_settings,
        )
        async with conn.cursor() as cur:
            if channel_info.encounter_message_id:
                try:
                    message = await channel.fetch_message(
                        channel_info.encounter_message_id
                    )
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
    print(f"Posting encounter took {(datetime.now() - start_time).total_seconds()}s")


@app.get("/")
def read_root():
    return {"Hello": "World"}


async def fetch_whitelist() -> Set[str]:
    async with aiohttp.ClientSession() as session:
        async with session.get(
            "https://raw.githubusercontent.com/gleasonw/dnd-init-tracker/main/whitelist.txt"
        ) as resp:
            whitelist = set((await resp.text()).splitlines())
            return whitelist


whitelist: Set[str] | None = None


async def get_discord_user(
    token: Annotated[str, Depends(oauth2_scheme)]
) -> DiscordUser:
    global whitelist
    if not whitelist:
        whitelist = await fetch_whitelist()
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
                print(resp.headers)
                print(await resp.text())
                raise HTTPException(status_code=401, detail="Invalid token")




@app.put("/api/encounters/{encounter_id}/{participant_id}}")
async def update_encounter_creature(
    encounter_id: int,
    participant_id: int,
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
                        WHEN %s < 0 THEN 0F
                        WHEN %s > (SELECT max_hp FROM creatures WHERE id = %s) THEN (SELECT max_hp FROM creatures WHERE id = %s)
                        ELSE %s
                    END,
                    initiative = %s
                WHERE encounter_id = %s AND id = %s
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
                    participant_id,
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


@app.post("/api/encounters/{encounter_id}/remove/{participant_id}")
async def remove_creature_from_encounter(
    encounter_id: int, participant_id: int, user=Depends(get_discord_user)
) -> EncounterResponseWithParticipants:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            user_encounter = await get_user_encounter_by_id(encounter_id, user)
            await cur.execute(
                "DELETE FROM encounter_participants WHERE encounter_id=%s AND id=%s",
                (user_encounter.id, participant_id),
            )
    return EncounterResponseWithParticipants(
        **user_encounter.model_dump(),
        participants=await get_encounter_creatures(user_encounter.id),
    )


@app.get("/api/creatures/{creature_id}")
async def get_user_creature(
    creature_id: int, user=Depends(get_discord_user)
) -> Creature:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(Creature)) as cur:
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
    creature: Creature,
    user=Depends(get_discord_user),
) -> Creature:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(Creature)) as cur:
            await cur.execute(
                "UPDATE creatures SET name=%s, max_hp=%s, challenge_rating=%s, is_player=%s WHERE id=%s AND user_id=%s RETURNING *",
                (
                    creature.name,
                    creature.max_hp,
                    creature.challenge_rating,
                    creature.is_player,
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
    challenge_rating: Annotated[float, Form()] = 0,
    is_player: Annotated[bool, Form()] = False,
    user=Depends(get_discord_user),
) -> Creature:
    if icon.content_type not in ["image/png"] or stat_block.content_type not in [
        "image/png"
    ]:
        raise HTTPException(status_code=400, detail="Icon must be a JPEG or PNG file")

    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(Creature)) as cur:
            await cur.execute(
                """
                WITH creature_count AS (
                SELECT COUNT(*) FROM creatures WHERE user_id = %s
                ), insert_creature AS (
                INSERT INTO creatures (user_id, name, max_hp, challenge_rating, is_player)
                SELECT %s, %s, %s, %s, %s
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
                    challenge_rating,
                    is_player,
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
) -> List[Creature]:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "DELETE FROM creatures WHERE id=%s AND user_id=%s",
                (creature_id, user.id),
            )
            if cur.rowcount == 0:
                raise HTTPException(status_code=404, detail="Creature not found")
            s3 = boto3.resource(
                "s3",
                aws_access_key_id=os.getenv("AWS_ACCESS_KEY_ID"),
                aws_secret_access_key=os.getenv("AWS_SECRET_ACCESS_KEY"),
            )
            bucket = s3.Bucket(os.getenv("AWS_BUCKET_NAME"))
            bucket.delete_objects(
                Delete={
                    "Objects": [
                        {"Key": f"icon-{creature_id}.png"},
                        {"Key": f"stat_block-{creature_id}.png"},
                    ]
                }
            )
    return await get_user_creatures(user=user)


@app.get("/api/creatures")
async def get_user_creatures(
    name: Optional[str] = None,
    user=Depends(get_discord_user),
) -> List[Creature]:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(Creature)) as cur:
            params = [user.id]
            filter_clause = ""
            if name:
                filter_clause = "AND name ILIKE %s"
                params.append(f"%{name}%")
            await cur.execute(
                f"SELECT * FROM creatures WHERE user_id = %s {filter_clause} ORDER BY name ASC",
                params,
            )
            return await cur.fetchall()


class DiscordTextChannel(BaseModel):
    id: int
    name: str
    members: List[str]
    guild: str
    encounter_message_id: Optional[int] = None


@app.get("/api/discord-channel")
async def get_discord_channel(user=Depends(get_discord_user)) -> DiscordTextChannel:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT channel_id, message_id FROM channels WHERE user_id = %s",
                (user.id,),
            )
            ids = await cur.fetchone()
            if not ids:
                raise HTTPException(status_code=404, detail="Discord channel not found")
            channel_id, message_id = ids
            channel = bot.get_channel(channel_id)
            assert isinstance(
                channel, discord.TextChannel
            ), "Channel is not a text channel"
            return DiscordTextChannel(
                id=channel.id,
                name=channel.name,
                members=[member.name for member in channel.members],
                guild=channel.guild.name,
                encounter_message_id=message_id,
            )


class Settings(BaseModel):
    show_health: bool
    show_icons: bool
    average_turn_duration: int
    player_level: int


@app.get("/api/settings")
async def get_settings(
    user=Depends(get_discord_user),
) -> Settings:
    async with pool.connection() as conn:
        async with conn.cursor(row_factory=class_row(Settings)) as cur:
            await cur.execute(
                "SELECT show_health, show_icons, average_turn_duration, player_level FROM discord_settings WHERE user_id = %s",
                (user.id,),
            )
            if cur.rowcount == 0:
                await cur.execute(
                    "INSERT INTO discord_settings (user_id, show_health, show_icons, average_turn_duration, player_level) VALUES (%s, %s, %s, %s, %s)",
                    (user.id, True, True, 180, 1),
                )
                await conn.commit()
                await cur.execute(
                    "SELECT show_health, show_icons, average_turn_duration, player_level FROM discord_settings WHERE user_id = %s",
                    (user.id,),
                )
            settings = await cur.fetchone()
            if not settings:
                raise HTTPException(status_code=404, detail="Settings not found")
            return settings


@app.put("/api/settings")
async def update_settings(settings: Settings, user=Depends(get_discord_user)) -> None:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                """
            INSERT INTO discord_settings (user_id, show_health, show_icons, average_turn_duration, player_level) 
            VALUES (%s, %s, %s, %s, %s) 
            ON CONFLICT (user_id) 
            DO UPDATE SET show_health = EXCLUDED.show_health, show_icons = EXCLUDED.show_icons, average_turn_duration = EXCLUDED.average_turn_duration, player_level = EXCLUDED.player_level
            """,
                (
                    user.id,
                    settings.show_health,
                    settings.show_icons,
                    settings.average_turn_duration,
                    settings.player_level,
                ),
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


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=int(os.getenv("PORT", 8000)))
