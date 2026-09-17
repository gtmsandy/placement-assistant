from models import User


GENERIC_RECOVERY_MESSAGE = (
    "If an account matches that identifier, "
    "recovery instructions can be sent."
)


def prepare_password_recovery(
    user: User | None,
) -> None:
    """Phase A boundary for future recovery delivery providers."""
    if user is None:
        return

    # Provider delivery and recovery-token persistence are intentionally
    # deferred to the next authentication phase.
    return
