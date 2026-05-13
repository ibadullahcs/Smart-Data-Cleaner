# backend/test_supabase.py
import asyncio
from app.supabase_client import supabase_client

async def test_connection():
    print("Testing Supabase connection...")
    
    # Test query on cleaning_jobs table
    result = await supabase_client.query("cleaning_jobs", select="*")
    print(f"✅ Query result: {result}")
    
    # Test insert (this will fail if RLS requires auth - that's expected)
    test_data = {
        "user_id": "00000000-0000-0000-0000-000000000000",
        "original_filename": "test.csv",
        "status": "pending"
    }
    
    insert_result = await supabase_client.insert("cleaning_jobs", test_data)
    print(f"Insert result: {insert_result}")
    
    print("\n✅ Supabase connection test completed!")

if __name__ == "__main__":
    asyncio.run(test_connection())