import { useNavigate, useParams } from 'react-router-dom'

import { usePlacements } from '../../context/PlacementContext'
import { useStudent } from '../../context/StudentContext'
import { useApplications } from '../../context/ApplicationContext'

import { checkEligibility } from '../../services/eligibilityService'

function OpportunityDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const { drives } = usePlacements()
  const { student } = useStudent()

  const {
    applyToDrive,
    getApplication,
  } = useApplications()

  const drive = drives.find(
    (item) =>
      String(item.id) === String(id)
  )

  /*
    If the drive does not exist.
  */

  if (!drive) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">

          <h1 className="text-xl font-bold text-slate-900">
            Placement drive not found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            This placement opportunity may
            no longer be available.
          </p>

          <button
            onClick={() =>
              navigate('/student')
            }
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Dashboard
          </button>

        </div>

      </div>
    )
  }

  /*
    Calculate eligibility using the
    current student profile.
  */

  const eligibility =
    checkEligibility(
      student,
      drive
    )

  /*
    Find whether the student has
    already applied.
  */

  const application =
    getApplication(
      drive.id,
      student.id
    )

  /*
    Format date/time for display.
  */

  const formatDate = (date) => {
    if (!date) {
      return 'Not specified'
    }

    const parsedDate =
      new Date(date)

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date
    }

    return parsedDate.toLocaleString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    )
  }

  /*
    Return the JD filename regardless
    of whether jd is currently a File
    object or a string returned by API.
  */

  const getJdName = () => {
    if (!drive.jd) {
      return ''
    }

    if (
      typeof drive.jd === 'string'
    ) {
      return drive.jd
    }

    return (
      drive.jd.name ||
      'Job Description'
    )
  }

  /*
    Apply to placement drive.
  */

  const handleApply = async () => {

    const currentEligibility =
      checkEligibility(
        student,
        drive
      )

    if (
      !currentEligibility.eligible
    ) {
      alert(
        'You are not eligible for this placement drive.'
      )

      return
    }

    if (application) {
      alert(
        'You have already applied to this placement drive.'
      )

      return
    }

    const success =
      await applyToDrive(
        drive,
        student
      )

    if (success) {
      alert(
        'Application recorded successfully!'
      )
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-5 py-4">

        <div className="mx-auto max-w-3xl">

          <button
            onClick={() =>
              navigate('/student')
            }
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>

        </div>

      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-6">

        {/* Company Header */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-start justify-between gap-4">

            <div>

              <h1 className="text-2xl font-bold text-slate-900">
                {drive.companyName}
              </h1>

              <p className="mt-1 text-slate-500">
                {drive.role}
              </p>

            </div>

            {eligibility.eligible ? (

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                Eligible
              </span>

            ) : (

              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                Not Eligible
              </span>

            )}

          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-500">
                CTC
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {drive.ctc ||
                  'Not specified'}
              </p>

            </div>

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-500">
                Location
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {drive.location ||
                  'Not specified'}
              </p>

            </div>

          </div>

        </section>

        {/* Eligibility */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between">

            <h2 className="text-lg font-bold text-slate-900">
              Your Eligibility
            </h2>

            {eligibility.eligible ? (

              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                ✓ Eligible
              </span>

            ) : (

              <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                ✕ Not Eligible
              </span>

            )}

          </div>

          {/* Eligibility reasons */}

          {!eligibility.eligible &&
            eligibility.reasons &&
            eligibility.reasons.length >
              0 && (

              <div className="mt-4 rounded-xl bg-red-50 p-4">

                <p className="text-sm font-semibold text-red-700">
                  Why you're not eligible
                </p>

                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-red-600">

                  {eligibility.reasons.map(
                    (
                      reason,
                      index
                    ) => (

                      <li
                        key={`${reason}-${index}`}
                      >
                        {reason}
                      </li>

                    )
                  )}

                </ul>

              </div>

            )}

          <div className="mt-5 space-y-3">

            {/* CGPA */}

            <div className="flex items-center justify-between gap-4">

              <span className="text-sm text-slate-600">
                CGPA
              </span>

              <span
                className={`text-sm font-semibold ${
                  student.cgpa >=
                  drive.minCgpa
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >

                {student.cgpa >=
                drive.minCgpa
                  ? '✓'
                  : '✕'}{' '}

                {student.cgpa}

                {drive.minCgpa !== '' &&
                  drive.minCgpa !==
                    undefined
                  ? ` / Required ${drive.minCgpa}`
                  : ''}

              </span>

            </div>

            {/* 10th */}

            <div className="flex items-center justify-between gap-4">

              <span className="text-sm text-slate-600">
                10th Percentage
              </span>

              <span
                className={`text-sm font-semibold ${
                  student.tenthPercentage >=
                  drive.minTenth
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >

                {student.tenthPercentage >=
                drive.minTenth
                  ? '✓'
                  : '✕'}{' '}

                {student.tenthPercentage}%

                {drive.minTenth !== '' &&
                  drive.minTenth !==
                    undefined
                  ? ` / Required ${drive.minTenth}%`
                  : ''}

              </span>

            </div>

            {/* 12th */}

            <div className="flex items-center justify-between gap-4">

              <span className="text-sm text-slate-600">
                12th Percentage
              </span>

              <span
                className={`text-sm font-semibold ${
                  student.twelfthPercentage >=
                  drive.minTwelfth
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >

                {student.twelfthPercentage >=
                drive.minTwelfth
                  ? '✓'
                  : '✕'}{' '}

                {student.twelfthPercentage}%

                {drive.minTwelfth !== '' &&
                  drive.minTwelfth !==
                    undefined
                  ? ` / Required ${drive.minTwelfth}%`
                  : ''}

              </span>

            </div>

            {/* Branch */}

            <div className="flex items-center justify-between gap-4">

              <span className="text-sm text-slate-600">
                Branch
              </span>

              <span
                className={`text-sm font-semibold ${
                  !drive.branches ||
                  drive.branches
                    .split(',')
                    .map(
                      (branch) =>
                        branch
                          .trim()
                          .toLowerCase()
                    )
                    .includes(
                      String(
                        student.branch
                      )
                        .trim()
                        .toLowerCase()
                    )
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >

                {drive.branches ||
                  'Any'}

              </span>

            </div>

            {/* Backlogs */}

            <div className="flex items-center justify-between gap-4">

              <span className="text-sm text-slate-600">
                Backlogs
              </span>

              <span
                className={`text-sm font-semibold ${
                  Number(
                    student.activeBacklogs
                  ) <=
                  Number(
                    drive.maxBacklogs
                  )
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >

                {Number(
                  student.activeBacklogs
                ) <=
                Number(
                  drive.maxBacklogs
                )
                  ? '✓'
                  : '✕'}{' '}

                {student.activeBacklogs}

                {drive.maxBacklogs !== '' &&
                  drive.maxBacklogs !==
                    undefined
                  ? ` / Maximum ${drive.maxBacklogs}`
                  : ''}

              </span>

            </div>

            {/* Graduation Year */}

            <div className="flex items-center justify-between gap-4">

              <span className="text-sm text-slate-600">
                Graduation Year
              </span>

              <span
                className={`text-sm font-semibold ${
                  String(
                    student.graduationYear
                  ) ===
                  String(
                    drive.graduationYear
                  )
                    ? 'text-green-600'
                    : 'text-red-600'
                }`}
              >

                {String(
                  student.graduationYear
                ) ===
                String(
                  drive.graduationYear
                )
                  ? '✓'
                  : '✕'}{' '}

                {student.graduationYear}

                {drive.graduationYear
                  ? ` / Required ${drive.graduationYear}`
                  : ''}

              </span>

            </div>

          </div>

        </section>

        {/* Important Dates */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Important Dates
          </h2>

          <div className="mt-4 space-y-4">

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Registration Deadline
              </p>

              <p className="mt-1 text-sm text-red-500">
                {formatDate(
                  drive.deadline
                )}
              </p>

            </div>

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Pre-Placement Talk
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {formatDate(
                  drive.ppt
                )}
              </p>

            </div>

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Online Test / OT
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {formatDate(
                  drive.ot
                )}
              </p>

            </div>

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Interview
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {formatDate(
                  drive.interview
                )}
              </p>

            </div>

          </div>

        </section>

        {/* Documents */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Documents
          </h2>

          <div className="mt-4">

            {drive.jd ? (

              <div className="flex items-center justify-between gap-4 rounded-xl bg-slate-50 p-4">

                <div className="min-w-0">

                  <p className="font-medium text-slate-900">
                    📄 Job Description
                  </p>

                  <p className="mt-1 truncate text-xs text-slate-500">
                    {getJdName()}
                  </p>

                </div>

                <button
                  type="button"
                  onClick={() =>
                    alert(
                      'JD viewing will be connected to file storage later.'
                    )
                  }
                  className="ml-4 shrink-0 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                >
                  View
                </button>

              </div>

            ) : (

              <div className="rounded-xl bg-slate-50 p-4">

                <p className="font-medium text-slate-900">
                  📄 Job Description
                </p>

                <p className="mt-1 text-sm text-slate-500">
                  No JD uploaded.
                </p>

              </div>

            )}

          </div>

        </section>

        {/* Registration */}

        {drive.registrationLink && (

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Company Registration
            </h2>

            <p className="mt-2 text-sm text-slate-500">
              Use the company's registration
              link to complete the application.
            </p>

            <a
              href={
                drive.registrationLink
              }
              target="_blank"
              rel="noreferrer"
              className="mt-5 block w-full rounded-xl bg-blue-600 py-3 text-center font-semibold text-white hover:bg-blue-700"
            >
              Open Registration Link
            </a>

          </section>

        )}

        {/* Application */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Application
          </h2>

          {application ? (

            <div>

              <div className="mt-4 rounded-xl bg-green-50 p-4">

                <p className="font-semibold text-green-700">
                  ✓ Application Recorded
                </p>

                <p className="mt-1 text-sm text-green-600">
                  You applied for this
                  placement drive.
                </p>

                <p className="mt-2 text-xs text-green-600">
                  Status: {application.status}
                </p>

              </div>

              <button
                onClick={() =>
                  navigate(
                    '/student/applications'
                  )
                }
                className="mt-4 w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                View My Applications
              </button>

            </div>

          ) : eligibility.eligible ? (

            <div>

              <p className="mt-2 text-sm text-slate-500">
                You meet the eligibility
                criteria for this placement
                drive.
              </p>

              <button
                onClick={handleApply}
                className="mt-5 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Apply Now
              </button>

            </div>

          ) : (

            <div>

              <div className="mt-3 rounded-xl bg-red-50 p-4">

                <p className="font-semibold text-red-700">
                  Application Not Available
                </p>

                <p className="mt-1 text-sm text-red-600">
                  You cannot apply because you
                  do not meet the eligibility
                  criteria for this placement
                  drive.
                </p>

              </div>

              <button
                onClick={() =>
                  navigate('/student')
                }
                className="mt-4 w-full rounded-xl border border-slate-300 py-3 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Opportunities
              </button>

            </div>

          )}

        </section>

      </main>

    </div>
  )
}

export default OpportunityDetails