from typing import Annotated, List, Optional, Dict, Tuple, Set
import aiohttp
from dotenv import load_dotenv
import os
from contextlib import asynccontextmanager
from fastapi.security import OAuth2PasswordBearer
from fastapi import (
    FastAPI,
    HTTPException,
    Depends,
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


class Settings(BaseModel):
    show_health: bool
    show_icons: bool
    average_turn_duration: int
    player_level: int


class EncounterResponse(BaseModel):
    id: int
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


class DiscordTextChannel(BaseModel):
    id: int
    name: str
    members: List[str]
    guild: str
    encounter_message_id: Optional[int] = None


class UserId(BaseModel):
    id: int


token_validation_cache: Dict[str, Tuple[datetime, DiscordUser]] = {}


async def post_encounter_to_user_channel(
    user_id: int, encounter: EncounterResponse, settings: Settings
):
    start_time = datetime.now()
    async with pool.connection() as conn:
        channel_info = await get_discord_channel(UserId(id=user_id))
        channel = bot.get_channel(channel_info.id)
        if not channel:
            return
        assert isinstance(channel, discord.TextChannel), "Channel is not a text channel"
        rendered_md = template.render(
            overview=encounter,
            settings=settings,
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
