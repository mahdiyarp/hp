import uuid
from typing import Dict, Any
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ...utils import generate_deterministic_hash
from ... import schemas, models
from ...api.deps import get_current_user
from ...db import get_db

router = APIRouter()

# For a prototype, we'll store claims in memory. In a real system, this would be a DB.
# claim_id -> IdentityClaimResponse
IN_MEMORY_CLAIMS: Dict[uuid.UUID, schemas.IdentityClaimResponse] = {}

def _generate_signature(issuer_id: str, subject_id: str, claim_type: str, claim_data: Dict[str, Any], issued_at: datetime) -> str:
    """
    Generates a deterministic signature for the claim using SHA256 hashing
    over a canonical representation of the claim's core data.
    """
    data_to_hash = {
        "issuer_id": issuer_id,
        "subject_id": subject_id,
        "claim_type": claim_type,
        "claim_data": claim_data,
        "issued_at": issued_at.isoformat(), # Ensure consistent string representation
    }
    return generate_deterministic_hash(data_to_hash)

@router.post("/identity/claims/issue", response_model=schemas.IdentityClaimResponse)
def issue_identity_claim(
    claim_request: schemas.IdentityClaimRequest,
    current_user: models.User = Depends(get_current_user), # Requires authentication
    db: Session = Depends(get_db)
):
    """
    Issues a new identity claim.
    For this prototype, the signature is a simple hash of the claim data.
    """
    # In a real system, current_user.id would be used as the issuer_id or validated against it.
    # For now, we'll use the issuer_id from the request.
    
    claim_id = uuid.uuid4()
    issued_at = datetime.now(timezone.utc)
    
    signature = _generate_signature(
        issuer_id=claim_request.issuer_id,
        subject_id=claim_request.subject_id,
        claim_type=claim_request.claim_type,
        claim_data=claim_request.claim_data,
        issued_at=issued_at
    )
    
    response = schemas.IdentityClaimResponse(
        claim_id=claim_id,
        issuer_id=claim_request.issuer_id,
        subject_id=claim_request.subject_id,
        claim_type=claim_request.claim_type,
        claim_data=claim_request.claim_data,
        issued_at=issued_at,
        signature=signature
    )
    
    IN_MEMORY_CLAIMS[claim_id] = response
    
    return response

@router.post("/identity/claims/verify", response_model=schemas.ClaimVerificationResponse)
def verify_identity_claim(
    verification_request: schemas.ClaimVerificationRequest,
    current_user: models.User = Depends(get_current_user), # Requires authentication
    db: Session = Depends(get_db)
):
    """
    Verifies an identity claim.
    For this prototype, verification means re-computing the hash and comparing.
    In a real system, this would involve cryptographic signature verification using the issuer's public key.
    """
    stored_claim = IN_MEMORY_CLAIMS.get(verification_request.claim_body.claim_id)
    
    if not stored_claim:
        return schemas.ClaimVerificationResponse(is_valid=False, reason="Claim not found")
    
    # Re-compute the expected signature from the stored claim's data
    expected_signature = _generate_signature(
        issuer_id=stored_claim.issuer_id,
        subject_id=stored_claim.subject_id,
        claim_type=stored_claim.claim_type,
        claim_data=stored_claim.claim_data,
        issued_at=stored_claim.issued_at
    )
    
    # Compare the recomputed signature with the stored one and the one provided in the request
    if expected_signature == stored_claim.signature and \
       verification_request.claim_body.issuer_id == stored_claim.issuer_id and \
       verification_request.claim_body.subject_id == stored_claim.subject_id and \
       verification_request.claim_body.claim_type == stored_claim.claim_type and \
       verification_request.claim_body.claim_data == stored_claim.claim_data and \
       verification_request.claim_body.signature == stored_claim.signature: # Also verify the signature provided in the request
        
        # Add a simple expiration check for completeness, though not cryptographically verified
        if (datetime.now(timezone.utc) - stored_claim.issued_at).days > 365: # Claims expire after 1 year
            return schemas.ClaimVerificationResponse(is_valid=False, reason="Claim expired")
            
        return schemas.ClaimVerificationResponse(is_valid=True, reason="Claim successfully verified (prototype)")
    else:
        return schemas.ClaimVerificationResponse(is_valid=False, reason="Claim data or signature mismatch")
