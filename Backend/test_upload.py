# test_upload.py
import requests

# First login
login_url = "http://localhost:8000/api/auth/login"
login_data = {
    "email": "ebaad746@gmail.com",
    "password": "ibad@#123"
}

print("🔐 Logging in...")
response = requests.post(login_url, json=login_data)

if response.status_code != 200:
    print(f"❌ Login failed: {response.text}")
    exit()

token = response.json().get("access_token")
print(f"✅ Login successful!")

# Create a test CSV
test_csv = """name,email,age
John,john@test.com,25
Jane,jane@test.com,30
"""

with open("test.csv", "w") as f:
    f.write(test_csv)

# Upload file
upload_url = "http://localhost:8000/api/upload"
headers = {"Authorization": f"Bearer {token}"}
files = {"file": ("test.csv", open("test.csv", "rb"), "text/csv")}

print("📤 Uploading file...")
response = requests.post(upload_url, headers=headers, files=files)

print(f"Status: {response.status_code}")
print(f"Response: {response.text}")