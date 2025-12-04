# Backend utilities package
# Re-implement deterministic hash here to avoid circular imports when package is imported
import json
import hashlib
from typing import Any, Dict

def generate_deterministic_hash(data: Dict[str, Any]) -> str:
	canonical_json_string = json.dumps(data, sort_keys=True, separators=(',', ':'))
	return hashlib.sha256(canonical_json_string.encode('utf-8')).hexdigest()
