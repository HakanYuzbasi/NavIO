"""Initial schema

Revision ID: 001
Revises:
Create Date: 2026-01-10

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '001'
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create floor_plans table
    op.create_table(
        'floor_plans',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('image_url', sa.String(512), nullable=False),
        sa.Column('image_width', sa.Integer(), nullable=False),
        sa.Column('image_height', sa.Integer(), nullable=False),
        sa.Column('organization_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
    )

    # Create nodes table
    op.create_table(
        'nodes',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('floor_plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('x', sa.Float(), nullable=False),
        sa.Column('y', sa.Float(), nullable=False),
        sa.Column('node_type', sa.String(50), nullable=False),
        sa.Column('name', sa.String(255), nullable=True),
        sa.Column('accessibility_level', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['floor_plan_id'], ['floor_plans.id'], ondelete='CASCADE'),
    )

    # Create edges table
    op.create_table(
        'edges',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('floor_plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('source_node_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('target_node_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('weight', sa.Float(), nullable=False),
        sa.Column('bidirectional', sa.Boolean(), nullable=False),
        sa.Column('accessible', sa.Boolean(), nullable=False),
        sa.Column('edge_type', sa.String(50), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['floor_plan_id'], ['floor_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['source_node_id'], ['nodes.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['target_node_id'], ['nodes.id'], ondelete='CASCADE'),
    )

    # Create pois table
    op.create_table(
        'pois',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('floor_plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('node_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('name', sa.String(255), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('category', sa.String(100), nullable=True),
        sa.Column('x', sa.Float(), nullable=False),
        sa.Column('y', sa.Float(), nullable=False),
        sa.Column('icon', sa.String(100), nullable=False),
        sa.Column('searchable', sa.Boolean(), nullable=False),
        sa.Column('metadata', postgresql.JSONB(), nullable=True),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['floor_plan_id'], ['floor_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['node_id'], ['nodes.id'], ondelete='SET NULL'),
    )

    # Create qr_anchors table
    op.create_table(
        'qr_anchors',
        sa.Column('id', postgresql.UUID(as_uuid=True), primary_key=True),
        sa.Column('floor_plan_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('node_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('code', sa.String(100), nullable=False, unique=True),
        sa.Column('x', sa.Float(), nullable=False),
        sa.Column('y', sa.Float(), nullable=False),
        sa.Column('qr_data', sa.Text(), nullable=False),
        sa.Column('placement_notes', sa.Text(), nullable=True),
        sa.Column('active', sa.Boolean(), nullable=False),
        sa.Column('scan_count', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.Column('updated_at', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['floor_plan_id'], ['floor_plans.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['node_id'], ['nodes.id'], ondelete='CASCADE'),
    )

    # Create indexes
    op.create_index('ix_nodes_floor_plan_id', 'nodes', ['floor_plan_id'])
    op.create_index('ix_edges_floor_plan_id', 'edges', ['floor_plan_id'])
    op.create_index('ix_pois_floor_plan_id', 'pois', ['floor_plan_id'])
    op.create_index('ix_pois_searchable', 'pois', ['searchable'])
    op.create_index('ix_qr_anchors_code', 'qr_anchors', ['code'])
    op.create_index('ix_qr_anchors_active', 'qr_anchors', ['active'])


def downgrade() -> None:
    op.drop_index('ix_qr_anchors_active')
    op.drop_index('ix_qr_anchors_code')
    op.drop_index('ix_pois_searchable')
    op.drop_index('ix_pois_floor_plan_id')
    op.drop_index('ix_edges_floor_plan_id')
    op.drop_index('ix_nodes_floor_plan_id')

    op.drop_table('qr_anchors')
    op.drop_table('pois')
    op.drop_table('edges')
    op.drop_table('nodes')
    op.drop_table('floor_plans')
