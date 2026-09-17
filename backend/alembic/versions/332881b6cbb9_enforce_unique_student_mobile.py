"""enforce unique student mobile

Revision ID: 332881b6cbb9
Revises: b7dc7968babe
Create Date: 2026-09-17 10:09:53.226503

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = '332881b6cbb9'
down_revision: Union[str, Sequence[str], None] = 'b7dc7968babe'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "UPDATE students "
            "SET mobile = NULL "
            "WHERE trim(mobile) = ''"
        )
    )
    op.create_unique_constraint(
        'uq_students_mobile',
        'students',
        ['mobile'],
    )


def downgrade() -> None:
    op.drop_constraint(
        'uq_students_mobile',
        'students',
        type_='unique',
    )
