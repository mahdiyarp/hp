from typing import List, Optional

from sqlalchemy.orm import Session

from .. import crud, models, schemas


def list_persons(session: Session, query: Optional[str]) -> List[models.Person]:
    return crud.get_persons(session, q=query)


def create_person(session: Session, payload: schemas.PersonCreate) -> models.Person:
    return crud.create_person(session, payload)


def list_person_activities(session: Session, person_id: str, limit: Optional[int]) -> List[models.PersonActivity]:
    return crud.list_person_activities(session, person_id=person_id, limit=int(limit or 100))


def create_person_activity(
    session: Session,
    person_id: str,
    payload: schemas.PersonActivityCreate,
    created_by_user_id: Optional[int],
) -> models.PersonActivity:
    return crud.create_person_activity(
        session,
        person_id=person_id,
        payload=payload,
        created_by_user_id=created_by_user_id,
    )


def delete_person_activity(session: Session, person_id: str, activity_id: int) -> bool:
    return crud.delete_person_activity(session, person_id=person_id, activity_id=activity_id)
