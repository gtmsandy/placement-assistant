export function checkEligibility(student, drive) {
  const reasons = []

  if (!student || !drive) {
    return {
      eligible: false,
      reasons: ['Student or placement drive information is missing.'],
    }
  }

  // CGPA
  if (
    drive.minCgpa !== '' &&
    drive.minCgpa !== null &&
    drive.minCgpa !== undefined
  ) {
    if (
      Number(student.cgpa) <
      Number(drive.minCgpa)
    ) {
      reasons.push(
        `Minimum CGPA required: ${drive.minCgpa}`
      )
    }
  }

  // 10th percentage
  if (
    drive.minTenth !== '' &&
    drive.minTenth !== null &&
    drive.minTenth !== undefined
  ) {
    if (
      Number(student.tenthPercentage) <
      Number(drive.minTenth)
    ) {
      reasons.push(
        `Minimum 10th percentage required: ${drive.minTenth}%`
      )
    }
  }

  // 12th percentage
  if (
    drive.minTwelfth !== '' &&
    drive.minTwelfth !== null &&
    drive.minTwelfth !== undefined
  ) {
    if (
      Number(student.twelfthPercentage) <
      Number(drive.minTwelfth)
    ) {
      reasons.push(
        `Minimum 12th percentage required: ${drive.minTwelfth}%`
      )
    }
  }

  // Backlogs
  if (
    drive.maxBacklogs !== '' &&
    drive.maxBacklogs !== null &&
    drive.maxBacklogs !== undefined
  ) {
    const studentBacklogs =
      student.activeBacklogs ??
      student.backlogs ??
      0

    if (
      Number(studentBacklogs) >
      Number(drive.maxBacklogs)
    ) {
      reasons.push(
        `Maximum allowed active backlogs: ${drive.maxBacklogs}`
      )
    }
  }

  // Branch
  if (drive.branches) {
    const eligibleBranches = String(
      drive.branches
    )
      .split(',')
      .map((branch) =>
        branch.trim().toLowerCase()
      )
      .filter(Boolean)

    const studentBranch = String(
      student.branch || ''
    )
      .trim()
      .toLowerCase()

    if (
      eligibleBranches.length > 0 &&
      !eligibleBranches.includes(studentBranch)
    ) {
      reasons.push(
        `Eligible branches: ${drive.branches}`
      )
    }
  }

  // Gender
  if (
    drive.gender &&
    drive.gender.toLowerCase() !== 'any'
  ) {
    if (
      String(student.gender || '')
        .toLowerCase() !==
      String(drive.gender).toLowerCase()
    ) {
      reasons.push(
        `Eligible gender: ${drive.gender}`
      )
    }
  }

  // Graduation year
  if (
    drive.graduationYear &&
    student.graduationYear
  ) {
    if (
      String(student.graduationYear) !==
      String(drive.graduationYear)
    ) {
      reasons.push(
        `Eligible graduation year: ${drive.graduationYear}`
      )
    }
  }

  return {
    eligible: reasons.length === 0,
    reasons,
  }
}