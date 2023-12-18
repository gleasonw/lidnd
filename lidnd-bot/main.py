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
from zoneinfo import ZoneInfo

load_dotenv()


CLIENT_ID = os.getenv("CLIENT_ID")
CLIENT_SECRET = os.getenv("CLIENT_SECRET")

pool = AsyncConnectionPool(
    os.getenv("DATABASE_URL", default="postgresql://will:password@localhost:5432/dnd"),
    open=False,
)


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
    user_id: str
    show_health_in_discord: bool
    show_icons_in_discord: bool
    average_turn_seconds: int
    default_player_level: int


class EncounterCreature(BaseModel):
    is_active: bool
    name: str
    hp: int
    creature_id: str


class Encounter(BaseModel):
    id: str
    name: Optional[str] = None
    description: Optional[str] = None


class DiscordTextChannel(BaseModel):
    id: int
    name: str
    members: List[str]
    guild: str
    encounter_message_id: Optional[int] = None


class Session(BaseModel):
    id: str
    user_id: str
    active_expires: datetime
    idle_expires: datetime


class User(BaseModel):
    id: str
    username: str
    avatar: str
    discord_id: str


class UserId(BaseModel):
    id: int


async def validate_auth(token: Annotated[str, Depends(oauth2_scheme)]) -> User:
    async with pool.connection() as conn:
        session = await get_session(token, conn)
        user = await get_user(session.user_id, conn)
        utc_now = datetime.utcnow().replace(tzinfo=ZoneInfo("UTC"))
        if session.idle_expires < utc_now:
            raise HTTPException(status_code=401, detail="Session has expired")
        return user


async def get_session(id: str, conn) -> Session:
    async with conn.cursor(row_factory=class_row(Session)) as cur:
        await cur.execute("SELECT * FROM user_session WHERE id = %s", (id,))
        session = await cur.fetchone()
        if not session:
            raise HTTPException(status_code=401, detail="Invalid token")
        return session


async def get_user(id: str, conn) -> User:
    async with conn.cursor(row_factory=class_row(User)) as cur:
        await cur.execute("SELECT * FROM users WHERE id = %s", (id,))
        user = await cur.fetchone()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        return user


@app.post("/api/post_encounter_to_user_channel")
async def post_encounter_to_user_channel(
    encounter: Encounter, settings: Settings, user=Depends(validate_auth)
):
    channel = await fetch_channel(user)
    if not channel:
        return
    await channel.send(
        f"""
## {encounter.name or "Unnamed encounter"}

https://lidnd.com/observe/{encounter.id}
"""
    )


async def fetch_channel(user=Depends(validate_auth)) -> discord.TextChannel:
    async with pool.connection() as conn:
        async with conn.cursor() as cur:
            await cur.execute(
                "SELECT channel_id, message_id FROM channels WHERE discord_user_id = %s",
                (user.discord_id,),
            )
            ids = await cur.fetchone()
            if not ids:
                raise HTTPException(status_code=404, detail="Discord channel not found")
            channel_id, _ = ids
            channel = bot.get_channel(channel_id)
            assert isinstance(
                channel, discord.TextChannel
            ), "Channel is not a text channel"
            return channel


@app.get("/api/discord-channel")
async def get_discord_channel(user=Depends(validate_auth)) -> DiscordTextChannel:
    channel = await fetch_channel(user)
    return DiscordTextChannel(
        id=channel.id,
        name=channel.name,
        members=[member.name for member in channel.members],
        guild=channel.guild.name,
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
                "DELETE FROM channels WHERE discord_user_id = %s", (ctx.author.id,)
            )
            await cur.execute(
                "INSERT INTO channels (channel_id, discord_user_id) VALUES (%s, %s)",
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
