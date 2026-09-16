PWD_ANY = "Any"
PWD_ONLY = "PwD Only"
NON_PWD_ONLY = "Non-PwD Only"

PWD_ELIGIBILITY_VALUES = (
    PWD_ANY,
    PWD_ONLY,
    NON_PWD_ONLY,
)


def check_eligibility(student, drive):
    if student.cgpa < drive.min_cgpa:
        return False, (
            f"Minimum CGPA required: "
            f"{drive.min_cgpa}"
        )

    if student.tenth_percentage < drive.min_tenth:
        return False, (
            f"Minimum 10th percentage required: "
            f"{drive.min_tenth}"
        )

    if student.twelfth_percentage < drive.min_twelfth:
        return False, (
            f"Minimum 12th percentage required: "
            f"{drive.min_twelfth}"
        )

    if student.active_backlogs > drive.max_backlogs:
        return False, (
            f"Maximum backlogs allowed: "
            f"{drive.max_backlogs}"
        )

    if drive.branches:
        allowed_branches = [
            branch.strip().upper()
            for branch in drive.branches.split(",")
            if branch.strip()
        ]

        if student.branch.upper() not in allowed_branches:
            return False, "Your branch is not eligible"

    if (
        drive.graduation_year
        and student.graduation_year
        != drive.graduation_year
    ):
        return False, (
            f"Graduation year must be "
            f"{drive.graduation_year}"
        )

    if (
        drive.gender
        and drive.gender.lower() != "any"
        and student.gender.lower()
        != drive.gender.lower()
    ):
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
