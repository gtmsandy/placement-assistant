import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'

import { usePlacements } from '../../context/PlacementContext'
import { useStudent } from '../../context/StudentContext'
import { checkEligibility } from '../../services/eligibilityService'
import StudentBottomNav from '../../components/StudentBottomNav'

function Calendar() {
  const navigate = useNavigate()

  const { drives } = usePlacements()
  const { student } = useStudent()

  const events = useMemo(() => {
    const result = []

    drives
      .filter(
        (drive) =>
          drive.status === 'Published'
      )
      .forEach((drive) => {
        const eligibility =
          checkEligibility(
            student,
            drive
          )

        if (!eligibility.eligible) {
          return
        }

        if (drive.deadline) {
          result.push({
            id: `${drive.id}-deadline`,
            driveId: drive.id,
            company: drive.companyName,
            type: 'Registration Deadline',
            title:
              `${drive.companyName} Registration Deadline`,
            date: drive.deadline,
            icon: '📝',
          })
        }

        if (drive.ppt) {
          result.push({
            id: `${drive.id}-ppt`,
            driveId: drive.id,
            company: drive.companyName,
            type: 'PPT',
            title:
              `${drive.companyName} Pre-Placement Talk`,
            date: drive.ppt,
            icon: '🎤',
          })
        }

        if (drive.ot) {
          result.push({
            id: `${drive.id}-ot`,
            driveId: drive.id,
            company: drive.companyName,
            type: 'Online Test',
            title:
              `${drive.companyName} Online Test`,
            date: drive.ot,
            icon: '💻',
          })
        }

        if (drive.interview) {
          result.push({
            id: `${drive.id}-interview`,
            driveId: drive.id,
            company: drive.companyName,
            type: 'Interview',
            title:
              `${drive.companyName} Interview`,
            date: drive.interview,
            icon: '👔',
          })
        }
      })

          return result
          .filter(
            (event) =>
            new Date(event.date) >= new Date()
          )
            .sort(
            (a, b) =>
            new Date(a.date) -
            new Date(b.date)
        )
  }, [drives, student])

  const formatDate = (date) => {
    if (!date) {
      return 'Date not specified'
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
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    )
  }

  const getEventStyle = (type) => {
    if (
      type ===
      'Registration Deadline'
    ) {
      return 'bg-red-100 text-red-700'
    }

    if (type === 'PPT') {
      return 'bg-purple-100 text-purple-700'
    }

    if (
      type === 'Online Test'
    ) {
      return 'bg-blue-100 text-blue-700'
    }

    if (type === 'Interview') {
      return 'bg-orange-100 text-orange-700'
    }

    return 'bg-slate-100 text-slate-700'
  }

  const upcomingPpts =
    events.filter(
      (event) =>
        event.type === 'PPT'
    ).length

  const interviews =
    events.filter(
      (event) =>
        event.type === 'Interview'
    ).length

  return (
    <div className="min-h-screen bg-slate-50 pb-24">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-5xl">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="text-2xl font-bold text-slate-900">
                Placement Calendar
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Keep track of your placement
                deadlines and recruitment events.
              </p>

            </div>

            <button
              onClick={() =>
                navigate(
                  '/student/reminders'
                )
              }
              className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              🔔 Reminder Settings
            </button>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">

        {/* Summary */}

        <section className="mb-6 grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Total Events
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {events.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              For eligible opportunities
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Upcoming PPTs
            </p>

            <p className="mt-2 text-3xl font-bold text-purple-600">
              {upcomingPpts}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Interviews
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-600">
              {interviews}
            </p>

          </div>

        </section>

        {/* Events */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="font-bold text-slate-900">
              Upcoming Placement Events
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Events from placement drives
              for which you are eligible.
            </p>

          </div>

          {events.length === 0 ? (

            <div className="p-10 text-center">

              <p className="text-lg font-semibold text-slate-900">
                No upcoming placement events
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Relevant recruitment events
                will appear here when eligible
                placement drives are scheduled.
              </p>

            </div>

          ) : (

            <div className="divide-y divide-slate-100">

              {events.map(
                (event) => (

                  <div
                    key={event.id}
                    className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div className="flex items-start gap-4">

                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                        {event.icon}
                      </div>

                      <div className="flex-1">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="font-semibold text-slate-900">
                            {event.title}
                          </h3>

                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStyle(
                              event.type
                            )}`}
                          >
                            {event.type}
                          </span>

                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {formatDate(
                            event.date
                          )}
                        </p>

                        <span className="mt-2 inline-block rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          ✓ You are eligible
                        </span>

                      </div>

                    </div>

                    <button
                      onClick={() =>
                        navigate(
                          `/student/opportunity/${event.driveId}`
                        )
                      }
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      View Drive
                    </button>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

      {/* Bottom Navigation */}

      <StudentBottomNav active="calendar" />

    </div>
  )
}

export default Calendar