"""Add users table and performance indexes

Revision ID: 003_add_users_and_indexes
Revises: 002_add_performance_indexes
Create Date: 2026-01-31

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '003_add_users_and_indexes'
down_revision = '002_add_performance_indexes'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create users table
    op.create_table(
        'users',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('email', sa.String(255), nullable=False),
        sa.Column('hashed_password', sa.String(255), nullable=False),
        sa.Column('full_name', sa.String(255), nullable=True),
        sa.Column('role', sa.String(50), nullable=False, server_default='viewer'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.PrimaryKeyConstraint('id')
    )

    # Create unique index on email
    op.create_index('ix_users_email', 'users', ['email'], unique=True)

    # Create index on organization_id for multi-tenancy queries
    op.create_index('ix_users_organization_id', 'users', ['organization_id'])

    # Create index on role for filtering by role
    op.create_index('ix_users_role', 'users', ['role'])

    # Add additional indexes for better query performance

    # Index on nodes.floor_plan_id for efficient node lookups
    op.create_index(
        'ix_nodes_floor_plan_id',
        'nodes',
        ['floor_plan_id'],
        if_not_exists=True
    )

    # Index on edges.floor_plan_id for efficient edge lookups
    op.create_index(
        'ix_edges_floor_plan_id',
        'edges',
        ['floor_plan_id'],
        if_not_exists=True
    )

    # Index on pois.floor_plan_id for efficient POI lookups
    op.create_index(
        'ix_pois_floor_plan_id',
        'pois',
        ['floor_plan_id'],
        if_not_exists=True
    )

    # Index on pois.category for category filtering
    op.create_index(
        'ix_pois_category',
        'pois',
        ['category'],
        if_not_exists=True
    )

    # Index on pois.searchable for search queries
    op.create_index(
        'ix_pois_searchable',
        'pois',
        ['searchable'],
        if_not_exists=True
    )

    # Index on qr_anchors.qr_code for QR code lookups
    op.create_index(
        'ix_qr_anchors_code',
        'qr_anchors',
        ['code'],
        if_not_exists=True
    )

    # Index on qr_anchors.active for active anchor filtering
    op.create_index(
        'ix_qr_anchors_active',
        'qr_anchors',
        ['active'],
        if_not_exists=True
    )

    # Composite index on edges for pathfinding queries
    op.create_index(
        'ix_edges_source_target',
        'edges',
        ['source_node_id', 'target_node_id'],
        if_not_exists=True
    )

    # Index on floor_plans.organization_id for multi-tenancy
    op.create_index(
        'ix_floor_plans_organization_id',
        'floor_plans',
        ['organization_id'],
        if_not_exists=True
    )


def downgrade() -> None:
    # Drop indexes
    op.drop_index('ix_floor_plans_organization_id', table_name='floor_plans')
    op.drop_index('ix_edges_source_target', table_name='edges')
    op.drop_index('ix_qr_anchors_active', table_name='qr_anchors')
    op.drop_index('ix_qr_anchors_code', table_name='qr_anchors')
    op.drop_index('ix_pois_searchable', table_name='pois')
    op.drop_index('ix_pois_category', table_name='pois')
    op.drop_index('ix_pois_floor_plan_id', table_name='pois')
    op.drop_index('ix_edges_floor_plan_id', table_name='edges')
    op.drop_index('ix_nodes_floor_plan_id', table_name='nodes')
    op.drop_index('ix_users_role', table_name='users')
    op.drop_index('ix_users_organization_id', table_name='users')
    op.drop_index('ix_users_email', table_name='users')

    # Drop users table
    op.drop_table('users')
