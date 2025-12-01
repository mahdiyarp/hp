from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ... import db, models, schemas
from ...services import crm as crm_service
from ..deps import require_roles

router = APIRouter(tags=["CRM"])


@router.get("/persons", response_model=List[schemas.PersonOut])
def list_persons(
    q: Optional[str] = None,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(
        require_roles(role_names=["Admin", "Accountant", "Manager", "Viewer"])
    ),
):
    return crm_service.list_persons(session, query=q)


@router.post("/persons", response_model=schemas.PersonOut)
def create_person(
    payload: schemas.PersonCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Accountant", "Manager", "Salesman"])),
):
    try:
        return crm_service.create_person(session, payload)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc


@router.get(
    "/persons/{person_id}/activities",
    response_model=List[schemas.PersonActivityOut],
)
def list_person_activities(
    person_id: str,
    limit: Optional[int] = 100,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(
        require_roles(role_names=["Admin", "Accountant", "Manager", "Salesman", "Viewer"])
    ),
):
    return crm_service.list_person_activities(session, person_id=person_id, limit=limit)


@router.post(
    "/persons/{person_id}/activities",
    response_model=schemas.PersonActivityOut,
)
def create_person_activity(
    person_id: str,
    payload: schemas.PersonActivityCreate,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(
        require_roles(role_names=["Admin", "Accountant", "Manager", "Salesman"])
    ),
):
    try:
        return crm_service.create_person_activity(
            session,
            person_id=person_id,
            payload=payload,
            created_by_user_id=getattr(current_user, "id", None),
        )
    except ValueError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.delete("/persons/{person_id}/activities/{activity_id}")
def delete_person_activity(
    person_id: str,
    activity_id: int,
    session: Session = Depends(db.get_db),
    current_user: models.User = Depends(require_roles(role_names=["Admin", "Manager"])),
):
    deleted = crm_service.delete_person_activity(session, person_id=person_id, activity_id=activity_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Activity not found")
    return {"ok": True}
