import json
import hashlib
from typing import Any, Dict

def generate_deterministic_hash(data: Dict[str, Any]) -> str:
    """
    Generates a deterministic SHA256 hash for a given dictionary.
    The dictionary is first serialized to a canonical JSON string
    (sorted keys, compact representation) to ensure consistent hashing.
    """
    # Ensure consistent order by sorting keys and using compact separators
    canonical_json_string = json.dumps(data, sort_keys=True, separators=(',', ':'))
    return hashlib.sha256(canonical_json_string.encode('utf-8')).hexdigest()
