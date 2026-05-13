# backend/app/supabase_client.py
import os
import json
from supabase import create_client, Client
from dotenv import load_dotenv

load_dotenv()


class SupabaseClient:
    def __init__(self):
        self.url = os.getenv("SUPABASE_URL")
        self.anon_key = os.getenv("SUPABASE_ANON_KEY")
        self.service_key = os.getenv("SUPABASE_SERVICE_KEY")
        
        if not self.url or not self.anon_key:
            print("❌ Supabase credentials missing!")
            self.client = None
            self.admin_client = None
        else:
            # Regular client with anon key
            self.client: Client = create_client(self.url, self.anon_key)
            # Admin client with service key (bypasses RLS)
            if self.service_key:
                self.admin_client: Client = create_client(self.url, self.service_key)
            else:
                self.admin_client = self.client
            print(f"✅ Supabase client initialized for {self.url}")
    
    def get_client(self) -> Client:
        """Get the Supabase client instance (anon key)"""
        if not self.client:
            raise Exception("Supabase client not initialized. Check your .env file.")
        return self.client
    
    def get_admin_client(self) -> Client:
        """Get admin client with service role key (bypasses RLS)"""
        if not self.admin_client:
            print("⚠️ Service key not available, using anon key")
            return self.get_client()
        return self.admin_client
    
    async def query(self, table: str, select: str = "*", filters: dict = None):
        """Query data from a table - FIXED: uses admin client to see data"""
        try:
            # Use admin client to bypass RLS and see all data
            query = self.get_admin_client().table(table).select(select)
            if filters:
                for key, value in filters.items():
                    if key == 'limit':
                        query = query.limit(value)
                    else:
                        query = query.eq(key, value)
            result = query.execute()
            print(f"📊 Query returned {len(result.data)} rows from {table}")
            return result.data
        except Exception as e:
            print(f"❌ Query error on {table}: {e}")
            return []
    
    async def insert(self, table: str, data: dict):
        """Insert data into a table (uses admin key to bypass RLS)"""
        try:
            print(f"📝 Inserting into {table}: {json.dumps(data, default=str)[:200]}")
            result = self.get_admin_client().table(table).insert(data).execute()
            print(f"✅ Insert successful")
            return {"success": True, "data": result.data}
        except Exception as e:
            print(f"❌ Insert error on {table}: {str(e)}")
            raise Exception(f"Supabase insert failed: {str(e)}")
    
    async def update(self, table: str, data: dict, match: dict):
        """Update data in a table (uses admin key)"""
        try:
            query = self.get_admin_client().table(table).update(data)
            for key, value in match.items():
                query = query.eq(key, value)
            result = query.execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            print(f"❌ Update error on {table}: {e}")
            return {"success": False, "error": str(e)}
    
    async def delete(self, table: str, match: dict):
        """Delete data from a table (uses admin key)"""
        try:
            query = self.get_admin_client().table(table).delete()
            for key, value in match.items():
                query = query.eq(key, value)
            result = query.execute()
            return {"success": True, "data": result.data}
        except Exception as e:
            print(f"❌ Delete error on {table}: {e}")
            return {"success": False, "error": str(e)}


# Singleton instance
supabase_client = SupabaseClient()


async def get_supabase_client():
    return supabase_client


async def verify_user_token(token: str):
    """Verify a JWT token using Supabase"""
    try:
        client = supabase_client.get_client()
        user = client.auth.get_user(token)
        return user.user.dict() if user else None
    except Exception as e:
        print(f"❌ Token verification failed: {e}")
        return None


async def verify_token(token: str):
    """Alias for verify_user_token"""
    return await verify_user_token(token)