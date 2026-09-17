import asyncpg
from fastapi import Request

async def get_conn(request: Request):
    async with request.app.state.pool.acquire() as conn:
        try:
            # Set RLS session context based on the current authenticated user
            # This requires get_current_user dependency to have populated request.state.user
            if hasattr(request.state, "user") and request.state.user:
                user = request.state.user
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", str(user.user_id))
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                if user.branch_id:
                    await conn.execute("SELECT set_config('app.current_branch_id', $1, true)", str(user.branch_id))
            yield conn
        finally:
            pass # Connection is released automatically by the context manager

async def get_admin_conn(request: Request):
    async with request.app.state.admin_pool.acquire() as conn:
        try:
            if hasattr(request.state, "user") and request.state.user:
                user = request.state.user
                await conn.execute("SELECT set_config('app.current_user_id', $1, true)", str(user.user_id))
                await conn.execute("SELECT set_config('app.current_role', $1, true)", user.role)
                if user.branch_id:
                    await conn.execute("SELECT set_config('app.current_branch_id', $1, true)", str(user.branch_id))
            yield conn
        finally:
            pass
