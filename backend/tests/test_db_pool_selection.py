import asyncio
from types import SimpleNamespace

from app.db import get_conn


class DummyConn:
    def __init__(self):
        self.calls = []

    async def execute(self, sql, *args):
        self.calls.append((sql, args))


class DummyPoolContext:
    def __init__(self, pool):
        self.pool = pool

    async def __aenter__(self):
        self.pool.acquired = self.pool.conn
        return self.pool.conn

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        return False


class DummyPool:
    def __init__(self, name):
        self.name = name
        self.conn = DummyConn()
        self.acquired = None

    def acquire(self):
        return DummyPoolContext(self)


def make_request(role):
    request = SimpleNamespace()
    request.state = SimpleNamespace(
        user=SimpleNamespace(user_id=42, role=role, branch_id=7)
    )
    request.app = SimpleNamespace(
        state=SimpleNamespace(
            pool=DummyPool("catms_app"),
            admin_pool=DummyPool("catms_admin"),
        )
    )
    return request


def test_get_conn_uses_admin_pool_for_administrator():
    async def _run():
        request = make_request("Administrator")
        conn_gen = get_conn(request)
        conn = await conn_gen.__anext__()

        assert request.app.state.pool.acquired is None
        assert request.app.state.admin_pool.acquired is conn
        assert conn.calls[0][1] == ("42",)
        assert conn.calls[1][1] == ("Administrator",)
        assert conn.calls[2][1] == ("7",)

        await conn_gen.aclose()

    asyncio.run(_run())


def test_get_conn_uses_app_pool_for_regular_user():
    async def _run():
        request = make_request("Receptionist")
        conn_gen = get_conn(request)
        conn = await conn_gen.__anext__()

        assert request.app.state.pool.acquired is conn
        assert request.app.state.admin_pool.acquired is None
        assert conn.calls[1][1] == ("Receptionist",)

        await conn_gen.aclose()

    asyncio.run(_run())
