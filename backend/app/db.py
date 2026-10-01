import asyncpg
from fastapi import Request


async def _set_session_context(conn, user):
    await conn.execute("SELECT set_config('app.current_user_id', $1, true)", str(user.user_id))
    await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
    if user.branch_id is not None:
        await conn.execute("SELECT set_config('app.current_branch_id', $1, true)", str(user.branch_id))


async def get_conn(request: Request):
    user = getattr(request.state, "user", None)
    pool = request.app.state.admin_pool if user and user.role == "Administrator" else request.app.state.pool

    async with pool.acquire() as conn:
        try:
            # Set RLS session context based on the current authenticated user.
            # Administrator requests must still use the Administrator RLS role even when
            # they are served by the catms_admin pool.
            if user:
                await _set_session_context(conn, user)
            yield conn
        finally:
            pass  # Connection is released automatically by the context manager


async def get_admin_conn(request: Request):
    async with request.app.state.admin_pool.acquire() as conn:
        try:
            user = getattr(request.state, "user", None)
            if user:
                await _set_session_context(conn, user)
            yield conn
        finally:
            pass
