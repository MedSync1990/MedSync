from contextlib import asynccontextmanager

import asyncpg
from fastapi import FastAPI

from app import config


@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(dsn=config.DATABASE_URL)
    yield
    await app.state.pool.close()


app = FastAPI(lifespan=lifespan)