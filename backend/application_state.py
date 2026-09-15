"""Canonical recruitment state transitions for placement applications.

``status`` describes the broad application outcome:

* ``Applied`` - registered and not yet through a configured screening round.
* ``Shortlisted`` - passed at least one round and still active.
* ``Selected`` / ``Rejected`` - terminal outcomes.

``current_stage`` records the active round for a non-terminal application and
the decisive round for a terminal application.  Consequently, a rejected
application intentionally retains the round at which it was rejected.
"""

from dataclasses import dataclass


STATUS_APPLIED = "Applied"
STATUS_SHORTLISTED = "Shortlisted"
STATUS_SELECTED = "Selected"
STATUS_REJECTED = "Rejected"

STAGE_APPLIED = "Applied"
STAGE_RESUME_SHORTLISTING = "Resume Shortlisting"
STAGE_PPT = "PPT"
STAGE_ONLINE_TEST = "Online Test"
STAGE_INTERVIEW = "Interview"
STAGE_RESULT = "Result"

APPLICATION_STATUSES = (
    STATUS_APPLIED,
    STATUS_SHORTLISTED,
    STATUS_SELECTED,
    STATUS_REJECTED,
)

APPLICATION_STAGES = (
    STAGE_APPLIED,
    STAGE_RESUME_SHORTLISTING,
    STAGE_PPT,
    STAGE_ONLINE_TEST,
    STAGE_INTERVIEW,
    STAGE_RESULT,
)

ROUND_STAGES = (
    STAGE_RESUME_SHORTLISTING,
    STAGE_PPT,
    STAGE_ONLINE_TEST,
    STAGE_INTERVIEW,
    STAGE_RESULT,
)

TERMINAL_STATUSES = {
    STATUS_SELECTED,
    STATUS_REJECTED,
}

ROUND_PASS_STATES = {
    STAGE_RESUME_SHORTLISTING: (
        STATUS_SHORTLISTED,
        STAGE_PPT,
    ),
    STAGE_PPT: (
        STATUS_SHORTLISTED,
        STAGE_ONLINE_TEST,
    ),
    STAGE_ONLINE_TEST: (
        STATUS_SHORTLISTED,
        STAGE_INTERVIEW,
    ),
    STAGE_INTERVIEW: (
        STATUS_SHORTLISTED,
        STAGE_RESULT,
    ),
    STAGE_RESULT: (
        STATUS_SELECTED,
        STAGE_RESULT,
    ),
}


@dataclass(frozen=True)
class ApplicationState:
    status: str
    current_stage: str


class ApplicationTransitionError(ValueError):
    """A controlled rejection of an invalid application transition."""

    def __init__(self, message: str, http_status: int = 400):
        super().__init__(message)
        self.http_status = http_status


def normalize_stage(stage) -> str:
    if not stage:
        return ""

    value = (
        str(stage)
        .strip()
        .lower()
        .replace("-", " ")
        .replace("_", " ")
    )
    value = " ".join(value.split())

    aliases = {
        "applied": STAGE_APPLIED,
        "resume shortlisting": STAGE_RESUME_SHORTLISTING,
        "resumeshortlisting": STAGE_RESUME_SHORTLISTING,
        "ppt": STAGE_PPT,
        "online test": STAGE_ONLINE_TEST,
        "onlinetest": STAGE_ONLINE_TEST,
        "interview": STAGE_INTERVIEW,
        "result": STAGE_RESULT,
    }
    return aliases.get(value, str(stage).strip())


def initial_application_state(resume_shortlisting: bool) -> ApplicationState:
    stage = (
        STAGE_RESUME_SHORTLISTING
        if resume_shortlisting
        else STAGE_APPLIED
    )
    return ApplicationState(STATUS_APPLIED, stage)


def _state_of(application) -> ApplicationState:
    return ApplicationState(
        application.status or STATUS_APPLIED,
        normalize_stage(application.current_stage or STAGE_APPLIED),
    )


def _assert_valid_active_state(
    state: ApplicationState,
    resume_shortlisting: bool,
) -> None:
    valid_states = {
        ApplicationState(STATUS_APPLIED, STAGE_APPLIED),
        ApplicationState(STATUS_SHORTLISTED, STAGE_PPT),
        ApplicationState(STATUS_SHORTLISTED, STAGE_ONLINE_TEST),
        ApplicationState(STATUS_SHORTLISTED, STAGE_INTERVIEW),
        ApplicationState(STATUS_SHORTLISTED, STAGE_RESULT),
    }

    if resume_shortlisting:
        valid_states.add(
            ApplicationState(
                STATUS_APPLIED,
                STAGE_RESUME_SHORTLISTING,
            )
        )

    if state not in valid_states:
        raise ApplicationTransitionError(
            "The application's current status and stage are inconsistent"
        )


def next_manual_state(
    application,
    resume_shortlisting: bool,
) -> ApplicationState:
    state = _state_of(application)

    if state.status in TERMINAL_STATUSES:
        raise ApplicationTransitionError(
            f"{state.status} applications are terminal and cannot transition",
            http_status=409,
        )

    _assert_valid_active_state(state, resume_shortlisting)

    if state.current_stage == STAGE_APPLIED:
        if resume_shortlisting:
            return ApplicationState(
                STATUS_APPLIED,
                STAGE_RESUME_SHORTLISTING,
            )
        return ApplicationState(STATUS_SHORTLISTED, STAGE_PPT)

    next_state = ROUND_PASS_STATES.get(state.current_stage)
    if next_state:
        return ApplicationState(*next_state)

    raise ApplicationTransitionError("Invalid current recruitment stage")


def _rejection_stage(
    application,
    resume_shortlisting: bool,
) -> str:
    state = _state_of(application)

    if state.status in TERMINAL_STATUSES:
        raise ApplicationTransitionError(
            f"{state.status} applications are terminal and cannot transition",
            http_status=409,
        )

    _assert_valid_active_state(state, resume_shortlisting)

    if state.current_stage == STAGE_APPLIED:
        return (
            STAGE_RESUME_SHORTLISTING
            if resume_shortlisting
            else STAGE_PPT
        )

    return state.current_stage


def transition_application(
    application,
    resume_shortlisting: bool,
    target_status: str,
    target_stage: str,
) -> None:
    """Apply one valid manual forward or rejection transition."""

    target_stage = normalize_stage(target_stage)

    if target_status not in APPLICATION_STATUSES:
        raise ApplicationTransitionError("Invalid application status")

    if target_stage not in APPLICATION_STAGES:
        raise ApplicationTransitionError("Invalid recruitment stage")

    if (
        target_stage == STAGE_RESUME_SHORTLISTING
        and not resume_shortlisting
    ):
        raise ApplicationTransitionError(
            "Resume shortlisting is not required for this placement drive"
        )

    if target_status == STATUS_REJECTED:
        expected = ApplicationState(
            STATUS_REJECTED,
            _rejection_stage(application, resume_shortlisting),
        )
    else:
        expected = next_manual_state(application, resume_shortlisting)

    requested = ApplicationState(target_status, target_stage)
    if requested != expected:
        raise ApplicationTransitionError(
            "Invalid application transition: expected "
            f"status '{expected.status}' at stage "
            f"'{expected.current_stage}'"
        )

    application.status = expected.status
    application.current_stage = expected.current_stage


def round_source_states(
    stage: str,
    resume_shortlisting: bool,
) -> set[ApplicationState]:
    """Return active states eligible to be processed for one round."""

    stage = normalize_stage(stage)

    if stage == STAGE_RESUME_SHORTLISTING:
        if not resume_shortlisting:
            return set()
        return {
            ApplicationState(STATUS_APPLIED, STAGE_APPLIED),
            ApplicationState(
                STATUS_APPLIED,
                STAGE_RESUME_SHORTLISTING,
            ),
        }

    if stage == STAGE_PPT:
        states = {
            ApplicationState(STATUS_SHORTLISTED, STAGE_PPT),
        }
        if not resume_shortlisting:
            states.add(ApplicationState(STATUS_APPLIED, STAGE_APPLIED))
        return states

    if stage in {
        STAGE_ONLINE_TEST,
        STAGE_INTERVIEW,
        STAGE_RESULT,
    }:
        return {ApplicationState(STATUS_SHORTLISTED, stage)}

    return set()


def is_application_ready_for_round(
    application,
    resume_shortlisting: bool,
    stage: str,
) -> bool:
    return _state_of(application) in round_source_states(
        stage,
        resume_shortlisting,
    )


def advance_application_for_round(
    application,
    resume_shortlisting: bool,
    stage: str,
) -> ApplicationState:
    """Advance an eligible application after it passes ``stage``."""

    stage = normalize_stage(stage)
    if not is_application_ready_for_round(
        application,
        resume_shortlisting,
        stage,
    ):
        raise ApplicationTransitionError(
            f"Application is not ready for the '{stage}' round",
            http_status=409,
        )

    next_state = ROUND_PASS_STATES[stage]
    application.status = next_state[0]
    application.current_stage = next_state[1]
    return ApplicationState(*next_state)


def reject_application_for_round(
    application,
    resume_shortlisting: bool,
    stage: str,
) -> ApplicationState:
    """Reject an eligible application and record its decisive round."""

    stage = normalize_stage(stage)
    if not is_application_ready_for_round(
        application,
        resume_shortlisting,
        stage,
    ):
        raise ApplicationTransitionError(
            f"Application is not ready for the '{stage}' round",
            http_status=409,
        )

    application.status = STATUS_REJECTED
    application.current_stage = stage
    return ApplicationState(STATUS_REJECTED, stage)


def next_stage_after_round(stage: str):
    state = ROUND_PASS_STATES.get(normalize_stage(stage))
    if not state or state[0] == STATUS_SELECTED:
        return None
    return state[1]
