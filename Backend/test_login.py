# test_login.py
import requests
import json

url = "http://localhost:8000/api/auth/login"
data = {
    "email": "ebaad746@gmail.com",
    "password": "ibad@#123"
}

print("🔐 Attempting login...")
response = requests.post(url, json=data)

print(f"Status code: {response.status_code}")
print(f"Response: {response.text}")

if response.status_code == 200:
    token = response.json().get("access_token")
    print(f"✅ Login successful!")
    print(f"Token: {token[:50]}...")
else:
    print("❌ Login failed")