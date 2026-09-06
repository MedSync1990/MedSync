# app/db.py
import asyncpg
from app import config

async def create_pools():
    app_pool = await asyncpg.create_pool(dsn=config.DATABASE_URL)
    #admin_pool = await asyncpg.create_pool(dsn=config.DATABASE_ADMIN_URL)
    return app_pool#, admin_pool