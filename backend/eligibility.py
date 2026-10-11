PWD_ANY = "Any"
PWD_ONLY = "PwD Only"
NON_PWD_ONLY = "Non-PwD Only"

PWD_ELIGIBILITY_VALUES = (
    PWD_ANY,
    PWD_ONLY,
    NON_PWD_ONLY,
)


def check_eligibility(student, drive):
    if drive.min_cgpa and student.cgpa is None:
        return False, (
            "CGPA information is required to determine "
            "eligibility for this drive."
        )

    if drive.min_cgpa and student.cgpa < drive.min_cgpa:
        return False, (
            f"Minimum CGPA required: "
            f"{drive.min_cgpa}"
        )

    if drive.min_tenth and student.tenth_percentage is None:
        return False, (
            "10th percentage information is required to determine "
            "eligibility for this drive."
        )

    if drive.min_tenth and student.tenth_percentage < drive.min_tenth:
        return False, (
            f"Minimum 10th percentage required: "
            f"{drive.min_tenth}"
        )

    if drive.min_twelfth and student.twelfth_percentage is None:
        return False, (
            "12th percentage information is required to determine "
            "eligibility for this drive."
        )

    if drive.min_twelfth and student.twelfth_percentage < drive.min_twelfth:
        return False, (
            f"Minimum 12th percentage required: "
            f"{drive.min_twelfth}"
        )

    if drive.max_backlogs is not None and student.active_backlogs is None:
        return False, (
            "Backlog information is required to determine "
            "eligibility for this drive."
        )

    if (
        drive.max_backlogs is not None
        and student.active_backlogs > drive.max_backlogs
    ):
        return False, (
            f"Maximum backlogs allowed: "
            f"{drive.max_backlogs}"
        )

    if drive.branches:
        if not student.branch:
            return False, (
                "Branch information is required to determine "
                "eligibility for this drive."
            )

        allowed_branches = [
            branch.strip().upper()
            for branch in drive.branches.split(",")
            if branch.strip()
        ]

        if student.branch.upper() not in allowed_branches:
            return False, "Your branch is not eligible"

    if (
        drive.graduation_year
        and student.graduation_year is None
    ):
        return False, (
            "Graduation year information is required to determine "
            "eligibility for this drive."
        )

    if (
        drive.graduation_year
        and student.graduation_year != drive.graduation_year
    ):
        return False, (
            f"Graduation year must be "
            f"{drive.graduation_year}"
        )

    if (
        drive.gender
        and drive.gender.lower() != "any"
    ):
        if not student.gender:
            return False, (
                "Gender information is required to determine "
                "eligibility for this drive."
            )

        if student.gender.lower() != drive.gender.lower():
            return False, (
                "Gender eligibility criteria "
                "not satisfied"
            )

    pwd_eligibility = (
        drive.pwd_eligibility or PWD_ANY
    )

    if pwd_eligibility != PWD_ANY:
        if student.specially_abled not in (True, False):
            return False, (
                "PwD status is required to determine "
                "eligibility for this drive."
            )

        if (
            pwd_eligibility == PWD_ONLY
            and student.specially_abled is not True
        ):
            return False, (
                "Only PwD candidates are eligible "
                "for this drive."
            )

        if (
            pwd_eligibility == NON_PWD_ONLY
            and student.specially_abled is not False
        ):
            return False, (
                "PwD candidates are not eligible "
                "for this drive."
            )

    return True, None
