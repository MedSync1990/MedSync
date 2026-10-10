import asyncpg
from fastapi import APIRouter, Depends, HTTPException, status
from app.db import get_conn
from app.dependencies import get_current_user, CurrentUser
from app.security import verify_password, hash_password
from app.schemas.profile import ProfileResponse, ProfileUpdateRequest, ChangePasswordRequest

router = APIRouter(prefix="/profile", tags=["profile"])

@router.get("/me", response_model=ProfileResponse)
async def get_my_profile(
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn),
):
    query = """
        SELECT 
            u.user_id,
            s.username,
            u.first_name,
            u.middle_name,
            u.last_name,
            u.email,
            u.id_number,
            u.address,
            u.birthdate::text as birthdate,
            u.gender,
            u.marital_status,
            r.role_name as role,
            s.branch_id,
            b.name as branch_name,
            (SELECT phone_number FROM contact c WHERE c.user_id = u.user_id LIMIT 1) as phone_number
        FROM app_user u
        JOIN staff s ON s.user_id = u.user_id
        JOIN role r ON r.role_id = u.role_id
        LEFT JOIN branch b ON b.branch_id = s.branch_id
        WHERE u.user_id = $1
    """

    row = await db.fetchrow(query, current_user.user_id)
    if not row:
        raise HTTPException(status_code=404, detail="Profile not found")
    return ProfileResponse(**dict(row))

@router.put("/me", response_model=ProfileResponse)
async def update_my_profile(
    payload: ProfileUpdateRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn),
):
    async with db.transaction():

        await db.execute(
            """
            UPDATE app_user
            SET first_name = COALESCE($1, first_name),
                middle_name = COALESCE($2, middle_name),
                last_name = COALESCE($3, last_name),
                email = COALESCE($4, email),
                birthdate = COALESCE($5::date, birthdate),
                gender = COALESCE($6::gender_enum, gender),
                marital_status = COALESCE($7, marital_status),
                address = COALESCE($8, address)
            WHERE user_id = $9
            """,
            payload.first_name,
            payload.middle_name,
            payload.last_name,
            payload.email,
            payload.birthdate,
            payload.gender.value if payload.gender else None,
            payload.marital_status,
            payload.address,
            current_user.user_id,
        )

        if payload.phone_number is not None:
            contact_exists = await db.fetchval(
                "SELECT contact_id FROM contact WHERE user_id = $1 LIMIT 1",
                current_user.user_id,
            )
            if contact_exists:
                await db.execute(
                    "UPDATE contact SET phone_number = $1 WHERE user_id = $2",
                    payload.phone_number,
                    current_user.user_id,
                )
            else:
                await db.execute(
                    "INSERT INTO contact (user_id, phone_number) VALUES ($1, $2)",
                    current_user.user_id,
                    payload.phone_number,
                )
        return await get_my_profile(current_user=current_user, db=db)


@router.post("/change-password")
async def change_password(
    payload: ChangePasswordRequest,
    current_user: CurrentUser = Depends(get_current_user),
    db: asyncpg.Connection = Depends(get_conn),
):
    row = await db.fetchrow(
        "SELECT password_hash FROM staff WHERE user_id = $1", current_user.user_id
    )
    if not row or not verify_password(payload.current_password, row["password_hash"]):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Current password is incorrect.",
        )

    if payload.new_password == payload.current_password:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="New password must be different from your current password.",
        )

    new_hash = hash_password(payload.new_password)
    await db.execute(
        "UPDATE staff SET password_hash = $1, must_change_password = FALSE WHERE user_id = $2",
        new_hash,
        current_user.user_id,
    )
    return {"message": "Password changed successfully"}


            
