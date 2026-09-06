# app/config.py
import os
import dotenv

dotenv.load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")        # catms_app connection (most requests)
#DATABASE_ADMIN_URL = os.getenv("DATABASE_ADMIN_URL")  # catms_admin connection (Administrator-role requests)