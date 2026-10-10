"""add student registration flow

Revision ID: 44ca310debb9
Revises: 1da9cb3da96d
Create Date: 2026-10-11 01:16:33.043839

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa



revision: str = '44ca310debb9'
down_revision: Union[str, Sequence[str], None] = '1da9cb3da96d'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_constraint(
        'ck_otp_challenges_purpose',
        'otp_challenges',
        type_='check',
    )
    op.create_check_constraint(
        'ck_otp_challenges_purpose',
        'otp_challenges',
        "purpose IN ('password_recovery', 'student_registration')",
    )
    op.add_column('otp_challenges', sa.Column('registration_email', sa.String(length=150), nullable=True))
    op.add_column('students', sa.Column('email_verified_at', sa.DateTime(timezone=True), nullable=True))
    op.create_index('uq_students_email_lower', 'students', [sa.literal_column('lower(email)')], unique=True)


def downgrade() -> None:
    op.drop_index('uq_students_email_lower', table_name='students')
    op.drop_column('students', 'email_verified_at')
    op.drop_column('otp_challenges', 'registration_email')
    op.drop_constraint(
        'ck_otp_challenges_purpose',
        'otp_challenges',
        type_='check',
    )
    op.create_check_constraint(
        'ck_otp_challenges_purpose',
        'otp_challenges',
        "purpose IN ('password_recovery')",
    )
