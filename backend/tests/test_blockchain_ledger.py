import pytest
from sqlalchemy.orm import Session
from datetime import datetime, timezone
import json
import hashlib

from backend.app import crud, models, schemas
from backend.app.utils import generate_deterministic_hash

@pytest.fixture(scope="module")
def db_session_fixture():
    # This fixture should provide a session to the test database
    # For simplicity, returning None, but in a real setup, this would init a test DB
    yield None

# --- Test generate_deterministic_hash ---
def test_generate_deterministic_hash_consistency():
    data1 = {"name": "test", "value": 123, "list": [1, 2, 3]}
    data2 = {"value": 123, "name": "test", "list": [1, 2, 3]} # Same data, different order
    data3 = {"name": "test", "value": 123, "list": [1, 3, 2]} # Different data

    hash1 = generate_deterministic_hash(data1)
    hash2 = generate_deterministic_hash(data2)
    hash3 = generate_deterministic_hash(data3)

    assert hash1 == hash2, "Hashes of same data with different key order should be identical"
    assert hash1 != hash3, "Hashes of different data should be different"

def test_generate_deterministic_hash_empty_data():
    empty_data = {}
    expected_hash = hashlib.sha256(json.dumps({}, sort_keys=True, separators=(',', ':')).encode('utf-8')).hexdigest()
    assert generate_deterministic_hash(empty_data) == expected_hash

def test_generate_deterministic_hash_with_types():
    data = {
        "string": "hello",
        "int": 123,
        "float": 1.23,
        "bool": True,
        "none": None,
        "list": [1, "two", False],
        "nested": {"a": 1, "b": "2"}
    }
    hash_val = generate_deterministic_hash(data)
    # Just check it returns a valid SHA256 hex digest (length 64)
    assert len(hash_val) == 64
    assert all(c in "0123456789abcdef" for c in hash_val)


# --- Test create_blockchain_entry ---
def test_create_blockchain_entry(db_session_fixture: Session):
    # For a real test, db_session_fixture would be a mock or test database session
    # For this prototype test, we'll simulate the behavior.
    
    # Simulate a session object if it's not a real one for this test environment
    class MockSession:
        def add(self, obj):
            self.added_obj = obj
        def commit(self):
            pass # No-op for mock
        def refresh(self, obj):
            obj.id = 1 # Simulate ID generation
            obj.created_at = datetime.now(timezone.utc)
            # Assign other fields from the added_obj
            for attr in ['entity_type', 'entity_id', 'action', 'data_hash', 'previous_hash', 'merkle_root', 'user_id', 'timestamp']:
                setattr(obj, attr, getattr(self.added_obj, attr, None))

    mock_session = MockSession()

    entity_data = {"some_field": "some_value", "another_field": 123}
    mock_data_hash = generate_deterministic_hash(entity_data)
    timestamp_val = datetime.now(timezone.utc).replace(microsecond=0) # Remove microseconds for consistent comparison

    entry_in = schemas.BlockchainEntryCreate(
        entity_type="test_entity",
        entity_id="test_id_123",
        action="create",
        data_hash=mock_data_hash,
        previous_hash=None,
        merkle_root=None,
        user_id=1,
        timestamp=timestamp_val
    )

    created_entry = crud.create_blockchain_entry(mock_session, entry_in)

    assert created_entry.id == 1
    assert created_entry.entity_type == entry_in.entity_type
    assert created_entry.entity_id == entry_in.entity_id
    assert created_entry.action == entry_in.action
    assert created_entry.data_hash == entry_in.data_hash
    assert created_entry.previous_hash == entry_in.previous_hash
    assert created_entry.merkle_root == entry_in.merkle_root
    assert created_entry.user_id == entry_in.user_id
    # Compare ISO formatted strings for datetime for consistency
    assert created_entry.timestamp.isoformat(timespec='seconds') == entry_in.timestamp.isoformat(timespec='seconds')
    assert created_entry.created_at is not None

def test_create_blockchain_entry_with_previous_hash(db_session_fixture: Session):
    class MockSession:
        def add(self, obj):
            self.added_obj = obj
        def commit(self):
            pass
        def refresh(self, obj):
            obj.id = 2
            obj.created_at = datetime.now(timezone.utc)
            # Assign other fields from the added_obj
            for attr in ['entity_type', 'entity_id', 'action', 'data_hash', 'previous_hash', 'merkle_root', 'user_id', 'timestamp']:
                setattr(obj, attr, getattr(self.added_obj, attr, None))
    
    mock_session = MockSession()

    entity_data_prev = {"field": "value_prev"}
    prev_hash = generate_deterministic_hash(entity_data_prev)
    
    entity_data_curr = {"field": "value_curr"}
    curr_data_hash = generate_deterministic_hash(entity_data_curr)
    timestamp_val = datetime.now(timezone.utc).replace(microsecond=0)

    entry_in = schemas.BlockchainEntryCreate(
        entity_type="another_entity",
        entity_id="another_id_456",
        action="update",
        data_hash=curr_data_hash,
        previous_hash=prev_hash,
        merkle_root="mock_merkle_root_val",
        user_id=2,
        timestamp=timestamp_val
    )

    created_entry = crud.create_blockchain_entry(mock_session, entry_in)

    assert created_entry.id == 2
    assert created_entry.entity_type == entry_in.entity_type
    assert created_entry.entity_id == entry_in.entity_id
    assert created_entry.action == entry_in.action
    assert created_entry.data_hash == curr_data_hash
    assert created_entry.previous_hash == prev_hash
    assert created_entry.merkle_root == "mock_merkle_root_val"
    assert created_entry.user_id == entry_in.user_id
    assert created_entry.timestamp.isoformat(timespec='seconds') == entry_in.timestamp.isoformat(timespec='seconds')
    assert created_entry.created_at is not None
