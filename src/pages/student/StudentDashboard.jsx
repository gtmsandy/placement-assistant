import { useNavigate } from 'react-router-dom'
import { usePlacements } from '../../context/PlacementContext'
import { useStudent } from '../../context/StudentContext'
import { useApplications } from '../../context/ApplicationContext'
import { checkEligibility } from '../../services/eligibilityService'

function StudentDashboard() {
  const navigate = useNavigate()

  const { drives } = usePlacements()
  const { student } = useStudent()
  const { applications } = useApplications()

  const formatDate = (date) => {
    if (!date) {
      return 'Not specified'
    }

    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return parsedDate.toLocaleString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    })
  }

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

      return {
        ...drive,
        eligibility,
      }
    })

  const eligibleOpportunities =
    opportunities.filter(
      (opportunity) =>
        opportunity.eligibility.eligible
    )

  const upcomingEvents = opportunities
    .filter(
      (opportunity) =>
        opportunity.eligibility.eligible
    )
    .flatMap((opportunity) => {
      const events = []

      if (opportunity.ppt) {
        events.push({
          id: `${opportunity.id}-ppt`,
          driveId: opportunity.id,
          company: opportunity.companyName,
          type: 'Pre-Placement Talk',
          date: opportunity.ppt,
          icon: '📅',
        })
      }

      if (opportunity.ot) {
        events.push({
          id: `${opportunity.id}-ot`,
          driveId: opportunity.id,
          company: opportunity.companyName,
          type: 'Online Test',
          date: opportunity.ot,
          icon: '💻',
        })
      }

      if (opportunity.interview) {
        events.push({
          id: `${opportunity.id}-interview`,
          driveId: opportunity.id,
          company: opportunity.companyName,
          type: 'Interview',
          date: opportunity.interview,
          icon: '🎯',
        })
      }

      return events
    })
    .sort(
      (a, b) =>
        new Date(a.date) - new Date(b.date)
    )

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
              {student.name ||
                student.fullName ||
                'Student'}{' '}
              👋
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
              {opportunities.length} available
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
                (opportunity) => (

                  <div
                    key={opportunity.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >

                    <div className="flex items-start justify-between gap-4">

                      <div>

                        <h3 className="text-lg font-bold text-slate-900">
                          {opportunity.companyName}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {opportunity.role}
                        </p>

                      </div>

                      {opportunity.eligibility.eligible ? (

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Eligible
                        </span>

                      ) : (

                        <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
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

                        <p className="mt-2 text-xs text-red-500">
                          Deadline:{' '}
                          {formatDate(
                            opportunity.deadline
                          )}
                        </p>

                      )}

                    </div>

                    {/* Eligibility Reasons */}

                    {!opportunity.eligibility.eligible && (

                      <div className="mt-4 rounded-xl bg-red-50 p-4">

                        <p className="text-xs font-semibold text-red-700">
                          Why you're not eligible
                        </p>

                        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-red-600">

                          {opportunity.eligibility.reasons.map(
                            (reason, index) => (

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
                        navigate(
                          `/student/opportunity/${opportunity.id}`
                        )
                      }
                      className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      View Opportunity
                    </button>

                  </div>

                )
              )

            )}

          </div>

        </section>

        {/* Upcoming Events */}

        <section>

          <div className="mb-4 flex items-center justify-between">

            <h2 className="text-lg font-bold text-slate-900">
              Upcoming
            </h2>

            <button
              onClick={() =>
                navigate('/student/calendar')
              }
              className="text-sm font-medium text-blue-600"
            >
              View Calendar
            </button>

          </div>

          <div className="space-y-3">

            {upcomingEvents.length === 0 ? (

              <div className="rounded-2xl bg-white p-5 shadow-sm">

                <p className="text-sm text-slate-500">
                  No upcoming placement events.
                </p>

              </div>

            ) : (

              upcomingEvents
                .slice(0, 5)
                .map((event) => (

                  <div
                    key={event.id}
                    className="rounded-2xl bg-white p-4 shadow-sm"
                  >

                    <div className="flex items-center justify-between gap-4">

                      <div>

                        <p className="font-semibold text-slate-900">
                          {event.company}{' '}
                          {event.type}
                        </p>

                        <p className="mt-1 text-sm text-slate-500">
                          {formatDate(event.date)}
                        </p>

                      </div>

                      <span className="text-xl">
                        {event.icon}
                      </span>

                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/student/opportunity/${event.driveId}`
                        )
                      }
                      className="mt-3 text-sm font-medium text-blue-600"
                    >
                      View Drive →
                    </button>

                  </div>

                ))

            )}

          </div>

        </section>

      </main>

      {/* Bottom Navigation */}

      <nav className="fixed bottom-0 left-0 right-0 border-t border-slate-200 bg-white">

        <div className="mx-auto flex max-w-5xl justify-around py-3">

          <button
            onClick={() =>
              window.scrollTo({
                top: 0,
                behavior: 'smooth',
              })
            }
            className="text-sm font-semibold text-blue-600"
          >
            Home
          </button>

          <button
            onClick={() =>
              navigate('/student/calendar')
            }
            className="text-sm text-slate-500 hover:text-blue-600"
          >
            Calendar
          </button>

          <button
            onClick={() =>
              navigate('/student/applications')
            }
            className="text-sm text-slate-500 hover:text-blue-600"
          >
            Applications
          </button>

        </div>

      </nav>

    </div>
  )
}

export default StudentDashboard