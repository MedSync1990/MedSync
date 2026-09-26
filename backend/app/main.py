import sys
import ssl
import asyncio
import socket
from contextlib import asynccontextmanager

# 1. Windows: Fix asyncpg ProactorEventLoop SSL dropping
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

# 2. Docker (WSL2): Force IPv4 resolution to prevent IPv6 "Network unreachable" crash
old_getaddrinfo = socket.getaddrinfo
def ipv4_getaddrinfo(*args, **kwargs):
    responses = old_getaddrinfo(*args, **kwargs)
    # Filter to only return IPv4 addresses (AF_INET)
    return [r for r in responses if r[0] == socket.AF_INET]
socket.getaddrinfo = ipv4_getaddrinfo
import asyncpg
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.config import config
from app.errors import (
    NotFoundError, not_found_exception_handler,
    ConflictError, conflict_exception_handler,
    ForbiddenError, forbidden_exception_handler,
    UnauthorizedError, unauthorized_exception_handler,
    AppValidationError, validation_exception_handler,
    generic_exception_handler
)
from app.routers import (
    auth, branches, staff, doctors, specialties, appointments,
    patients, allergies, treatments, consultations, invoices,
    payments, insurance, reports, stats
)

@asynccontextmanager
async def lifespan(app: FastAPI):
    app.state.pool = await asyncpg.create_pool(dsn=config.DATABASE_URL)
    app.state.admin_pool = await asyncpg.create_pool(dsn=config.get_admin_url())
    yield
    await app.state.pool.close()
    await app.state.admin_pool.close()

app = FastAPI(
    title="MedSync CATMS API",
    version="1.0.0",
    description="Centralized multi-branch clinic management system REST API.",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=config.CORS_ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-CSRF-Token"],
    expose_headers=["X-CSRF-Token"],
)

app.add_exception_handler(NotFoundError, not_found_exception_handler)  # type: ignore
app.add_exception_handler(ConflictError, conflict_exception_handler)  # type: ignore
app.add_exception_handler(ForbiddenError, forbidden_exception_handler)  # type: ignore
app.add_exception_handler(UnauthorizedError, unauthorized_exception_handler)  # type: ignore
app.add_exception_handler(AppValidationError, validation_exception_handler)  # type: ignore
app.add_exception_handler(Exception, generic_exception_handler)

app.include_router(auth.router, prefix="/api/v1/auth", tags=["Auth"])
app.include_router(branches.router, prefix="/api/v1/branches", tags=["Branches"])
app.include_router(staff.router, prefix="/api/v1/staff", tags=["Staff"])
app.include_router(doctors.router, prefix="/api/v1/doctors", tags=["Doctors"])
app.include_router(specialties.router, prefix="/api/v1/specialties", tags=["Specialties"])
app.include_router(appointments.router, prefix="/api/v1/appointments", tags=["Appointments"])
app.include_router(patients.router, prefix="/api/v1/patients", tags=["Patients"])
app.include_router(allergies.router, prefix="/api/v1/allergies", tags=["Allergies"])
app.include_router(treatments.router, prefix="/api/v1/treatments", tags=["Treatments"])
app.include_router(consultations.router, prefix="/api/v1/consultations", tags=["Consultations"])
app.include_router(invoices.router, prefix="/api/v1/invoices", tags=["Invoices"])
app.include_router(payments.router, prefix="/api/v1/payments", tags=["Payments"])
app.include_router(insurance.router, prefix="/api/v1/insurance", tags=["Insurance"])
app.include_router(reports.router, prefix="/api/v1/reports", tags=["Reports"])
app.include_router(stats.router, prefix="/api/v1/stats", tags=["Stats"])
