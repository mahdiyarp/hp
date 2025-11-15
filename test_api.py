#!/usr/bin/env python3
import requests
import json

BASE_URL = 'http://localhost:8000'

# Test login
print("Testing login...")
resp = requests.post(f'{BASE_URL}/api/auth/login', 
                     data={'username': 'admin', 'password': 'admin'})
print(f"Status: {resp.status_code}")
print(json.dumps(resp.json(), ensure_ascii=False, indent=2))

if resp.status_code == 200:
    token = resp.json()['access_token']
    headers = {'Authorization': f'Bearer {token}'}
    
    # Test get current user modules
    print("\n\nTesting GET /api/current-user/modules...")
    resp = requests.get(f'{BASE_URL}/api/current-user/modules', headers=headers)
    print(f"Status: {resp.status_code}")
    print(json.dumps(resp.json(), ensure_ascii=False, indent=2))
    
    # Test get current user permissions
    print("\n\nTesting GET /api/current-user/permissions...")
    resp = requests.get(f'{BASE_URL}/api/current-user/permissions', headers=headers)
    print(f"Status: {resp.status_code}")
    print(json.dumps(resp.json(), ensure_ascii=False, indent=2))
    
    # Test get roles
    print("\n\nTesting GET /api/roles...")
    resp = requests.get(f'{BASE_URL}/api/roles', headers=headers)
    print(f"Status: {resp.status_code}")
    print(json.dumps(resp.json(), ensure_ascii=False, indent=2))
