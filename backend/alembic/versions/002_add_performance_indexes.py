"""Add performance indexes

Revision ID: 002
Revises: 001
Create Date: 2026-01-11

This migration adds additional indexes for improved query performance:
- Composite indexes for common query patterns
- Indexes on frequently filtered columns
- Partial indexes for active records
"""
from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = '002'
down_revision = '001'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add composite index for edges - commonly queried by floor_plan and source/target
    op.create_index(
        'ix_edges_floor_source_target',
        'edges',
        ['floor_plan_id', 'source_node_id', 'target_node_id']
    )

    # Add index on edge accessibility for filtered pathfinding
    op.create_index(
        'ix_edges_accessible',
        'edges',
        ['accessible']
    )

    # Add composite index for POIs - commonly filtered by floor_plan and category
    op.create_index(
        'ix_pois_floor_category',
        'pois',
        ['floor_plan_id', 'category']
    )

    # Add composite index for searchable POIs (common query pattern)
    op.create_index(
        'ix_pois_floor_searchable',
        'pois',
        ['floor_plan_id', 'searchable']
    )

    # Add index for POI names (for search functionality)
    op.create_index(
        'ix_pois_name',
        'pois',
        ['name']
    )

    # Add composite index for QR anchors - commonly filtered by floor_plan and active
    op.create_index(
        'ix_qr_anchors_floor_active',
        'qr_anchors',
        ['floor_plan_id', 'active']
    )

    # Add index on floor_plans organization_id for multi-tenant queries
    op.create_index(
        'ix_floor_plans_organization',
        'floor_plans',
        ['organization_id']
    )

    # Add index on nodes for coordinate-based queries
    op.create_index(
        'ix_nodes_coordinates',
        'nodes',
        ['floor_plan_id', 'x', 'y']
    )


def downgrade() -> None:
    op.drop_index('ix_nodes_coordinates')
    op.drop_index('ix_floor_plans_organization')
    op.drop_index('ix_qr_anchors_floor_active')
    op.drop_index('ix_pois_name')
    op.drop_index('ix_pois_floor_searchable')
    op.drop_index('ix_pois_floor_category')
    op.drop_index('ix_edges_accessible')
    op.drop_index('ix_edges_floor_source_target')
