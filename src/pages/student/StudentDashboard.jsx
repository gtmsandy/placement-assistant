import { useNavigate } from 'react-router-dom'

import { usePlacements } from '../../context/PlacementContext'
import { useStudent } from '../../context/StudentContext'
import { useApplications } from '../../context/ApplicationContext'
import { checkEligibility } from '../../services/eligibilityService'
import StudentBottomNav from '../../components/StudentBottomNav'

function StudentDashboard() {
  const navigate = useNavigate()

  const { drives = [] } = usePlacements()
  const { student = {} } = useStudent()
  const { applications = [] } = useApplications()

  const now = new Date()

  const opportunities = drives
    .filter(
      (drive) =>
        drive.status === 'Published'
    )
    .map((drive) => {
      const eligibility = checkEligibility(
        student,
        drive
      )

      const isExpired =
        drive.deadline &&
        new Date(drive.deadline) < now

      return {
        ...drive,
        eligibility,
        isExpired,
      }
    })

  const eligibleOpportunities =
    opportunities.filter(
      (opportunity) =>
        opportunity.eligibility?.eligible &&
        !opportunity.isExpired
    )

  const studentName =
    student?.name ||
    student?.fullName ||
    student?.username ||
    'Student'

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* Header */}

      <header className="bg-white px-5 py-6 shadow-sm">

        <div className="mx-auto flex max-w-5xl items-start justify-between">

          <div>

            <p className="text-sm text-slate-500">
              Good morning
            </p>

            <h1 className="mt-1 text-2xl font-bold text-slate-900">
              {studentName} 👋
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Here is your placement overview.
            </p>

          </div>

          <button
            onClick={() =>
              navigate('/student/profile')
            }
            className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Profile
          </button>

        </div>

      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-6">

        {/* Overview */}

        <section className="grid grid-cols-2 gap-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Eligible
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {eligibleOpportunities.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              opportunities
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Applications
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {applications.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              submitted
            </p>

          </div>

        </section>

        {/* Placement Opportunities */}

        <section>

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-lg font-bold text-slate-900">
              Placement Opportunities
            </h2>

            <span className="text-sm text-slate-500">
              {opportunities.length} published
            </span>

          </div>

          <div className="space-y-4">

            {opportunities.length === 0 ? (

              <div className="rounded-2xl bg-white p-8 text-center shadow-sm">

                <p className="text-lg font-semibold text-slate-900">
                  No placement drives available
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  New opportunities will appear here
                  when the placement cell publishes them.
                </p>

              </div>

            ) : (

              opportunities.map(
                (opportunity) => {

                  const isEligible =
                    opportunity.eligibility?.eligible

                  const isExpired =
                    opportunity.isExpired

                  return (
                    <div
                      key={opportunity.id}
                      className={`rounded-2xl bg-white p-5 shadow-sm ${
                        isExpired
                          ? 'opacity-75'
                          : ''
                      }`}
                    >

                      {/* Company and status */}

                      <div className="flex items-start justify-between gap-4">

                        <div>

                          <h3 className="text-lg font-bold text-slate-900">
                            {opportunity.companyName}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {opportunity.role}
                          </p>

                        </div>

                        {isExpired ? (

                          <span className="shrink-0 rounded-full bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                            Expired
                          </span>

                        ) : isEligible ? (

                          <span className="shrink-0 rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Eligible
                          </span>

                        ) : (

                          <span className="shrink-0 rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Not Eligible
                          </span>

                        )}

                      </div>

                      {/* CTC and Location */}

                      <div className="mt-4">

                        <div className="flex flex-wrap items-center gap-x-5 gap-y-2">

                          <p className="text-sm font-semibold text-slate-900">
                            {opportunity.ctc ||
                              'CTC not specified'}
                          </p>

                          {opportunity.location && (

                            <p className="text-xs text-slate-500">
                              📍 {opportunity.location}
                            </p>

                          )}

                        </div>

                        {/* Deadline */}

                        {opportunity.deadline && (

                          <p
                            className={`mt-2 text-xs ${
                              isExpired
                                ? 'text-slate-500'
                                : 'text-red-500'
                            }`}
                          >

                            {isExpired
                              ? 'Deadline passed: '
                              : 'Deadline: '}

                            {new Date(
                              opportunity.deadline
                            ).toLocaleString(
                              'en-IN',
                              {
                                day: 'numeric',
                                month: 'short',
                                year: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit',
                              }
                            )}

                          </p>

                        )}

                      </div>

                      {/* Expired information */}

                      {isExpired && (

                        <div className="mt-4 rounded-xl bg-slate-100 p-4">

                          <p className="text-xs font-semibold text-slate-700">
                            Registration Closed
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            The registration deadline for this
                            placement drive has passed. You can
                            no longer apply for this opportunity.
                          </p>

                        </div>

                      )}

                      {/* Eligibility Reasons */}

                      {!isExpired &&
                        !isEligible && (

                          <div className="mt-4 rounded-xl bg-red-50 p-4">

                            <p className="text-xs font-semibold text-red-700">
                              Why you're not eligible
                            </p>

                            <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-600">

                              {(
                                opportunity
                                  .eligibility
                                  ?.reasons ||
                                []
                              ).map(
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

                      {/* View Opportunity */}

                      <button
                        onClick={() =>
                          !isExpired &&
                          navigate(
                            `/student/opportunity/${opportunity.id}`
                          )
                        }
                        disabled={isExpired}
                        className={`mt-4 rounded-lg px-4 py-2 text-sm font-medium ${
                          isExpired
                            ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {isExpired
                          ? 'Registration Closed'
                          : 'View Opportunity'}
                      </button>

                    </div>
                  )
                }
              )

            )}

          </div>

        </section>

      </main>

      {/* Bottom Navigation */}

      <StudentBottomNav active="home" />

    </div>
  )
}

export default StudentDashboard