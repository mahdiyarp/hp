"""Simple Redis pub/sub consumer for person_sync channel.

Run this script during development to observe person sync notifications.
It subscribes to the 'person_sync' channel and prints incoming messages.
If REDIS_URL not set, it exits.
"""
import os
import sys
import time

try:
    import redis
except Exception:
    print("redis package not installed. Run: pip install redis")
    sys.exit(1)

REDIS_URL = os.getenv('REDIS_URL')
if not REDIS_URL:
    print('REDIS_URL not set. Exiting.')
    sys.exit(1)

r = redis.from_url(REDIS_URL)
ps = r.pubsub()
ps.subscribe('person_sync')
print('Subscribed to person_sync channel. Listening...')
try:
    for msg in ps.listen():
        if msg and msg.get('type') == 'message':
            print('Received person_sync:', msg.get('data'))
except KeyboardInterrupt:
    print('Exiting consumer')
    ps.close()