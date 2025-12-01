"""
0035_person_activities

Create table for CRM person activities/notes.
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '0035'
down_revision = '0034'
branch_labels = None
depends_on = None

def upgrade() -> None:
    op.create_table(
        'person_activities',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('person_id', sa.String(length=128), nullable=False, index=True),
        sa.Column('kind', sa.String(length=32), nullable=True, index=True),
        sa.Column('content', sa.Text(), nullable=False),
        sa.Column('next_action_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', sa.Integer(), nullable=True, index=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['person_id'], ['persons.id'], name='fk_person_activities_person', ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['created_by'], ['users.id'], name='fk_person_activities_user', ondelete='SET NULL'),
    )


def downgrade() -> None:
    op.drop_table('person_activities')
