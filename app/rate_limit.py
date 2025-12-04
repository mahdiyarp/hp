import time
from fastapi import Response

# Dictionary to store request timestamps for each IP
request_windows = {}

# Rate limit settings
RATE_LIMIT_PER_MINUTE = 10
TIME_WINDOW = 60  # in seconds

def clear_windows():
    request_windows.clear()

async def rate_limit(client_ip: str):
    current_time = time.time()
    
    # Get the request timestamps for the client's IP
    request_timestamps = request_windows.get(client_ip, [])
    
    # Remove timestamps older than the time window
    request_timestamps = [t for t in request_timestamps if current_time - t < TIME_WINDOW]
    
    # Check if the number of requests exceeds the rate limit
    if len(request_timestamps) >= RATE_LIMIT_PER_MINUTE:
        return Response(status_code=429, content="Too Many Requests")
    
    # Add the current timestamp to the list
    request_timestamps.append(current_time)
    request_windows[client_ip] = request_timestamps
    
    return None