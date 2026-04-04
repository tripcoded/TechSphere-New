ACADEMIC_BRANCHES = (
    "Information Technology",
    "Computer Science and Engineering",
    "Mechanical Engineering",
    "Electrical Engineering",
)


def has_completed_academic_profile(profile: object | None) -> bool:
    if profile is None:
        return False

    roll_no = getattr(profile, "roll_no", None)
    branch = getattr(profile, "branch", None)
    year = getattr(profile, "year", None)

    return bool(
        isinstance(roll_no, str)
        and roll_no.strip()
        and isinstance(branch, str)
        and branch.strip()
        and isinstance(year, int)
    )

