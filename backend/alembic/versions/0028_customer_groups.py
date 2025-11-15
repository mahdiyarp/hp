"""add customer groups management

Revision ID: 0028
Revises: 0027
Create Date: 2025-11-14

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '0028'
down_revision = '0027'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'customer_groups',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('created_by_user_id', sa.Integer(), nullable=False),
        sa.Column('is_shared', sa.Boolean(), nullable=False, server_default=sa.text('false')),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['created_by_user_id'], ['users.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_customer_groups_created_by_user_id'), 'customer_groups', ['created_by_user_id'])
    op.create_index(op.f('ix_customer_groups_is_shared'), 'customer_groups', ['is_shared'])

    op.create_table(
        'customer_group_members',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('group_id', sa.Integer(), nullable=False),
        sa.Column('person_id', sa.String(128), nullable=False),
        sa.Column('added_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['group_id'], ['customer_groups.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['person_id'], ['persons.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('group_id', 'person_id', name='uq_group_person'),
    )
    op.create_index(op.f('ix_customer_group_members_group_id'), 'customer_group_members', ['group_id'])
    op.create_index(op.f('ix_customer_group_members_person_id'), 'customer_group_members', ['person_id'])


def downgrade() -> None:
    op.drop_index(op.f('ix_customer_group_members_person_id'), table_name='customer_group_members')
    op.drop_index(op.f('ix_customer_group_members_group_id'), table_name='customer_group_members')
    op.drop_table('customer_group_members')
    
    op.drop_index(op.f('ix_customer_groups_is_shared'), table_name='customer_groups')
    op.drop_index(op.f('ix_customer_groups_created_by_user_id'), table_name='customer_groups')
    op.drop_table('customer_groups')

