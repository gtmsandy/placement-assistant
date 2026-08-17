import { useNavigate } from 'react-router-dom'
import { usePlacements } from '../../context/PlacementContext'

function UpcomingEvents() {
  const navigate = useNavigate()

  const {
    drives,
    loading,
    error,
  } = usePlacements()

  const publishedDrives =
    drives.filter(
      (drive) =>
        drive.status === 'Published'
    )

  const events = []

  publishedDrives.forEach((drive) => {

    if (drive.deadline) {
      events.push({
        id: `${drive.id}-deadline`,
        driveId: drive.id,
        company: drive.companyName,
        role: drive.role,
        type: 'Registration Deadline',
        date: drive.deadline,
        icon: '📝',
      })
    }

    if (drive.ppt) {
      events.push({
        id: `${drive.id}-ppt`,
        driveId: drive.id,
        company: drive.companyName,
        role: drive.role,
        type: 'Pre-Placement Talk',
        date: drive.ppt,
        icon: '🎤',
      })
    }

    if (drive.ot) {
      events.push({
        id: `${drive.id}-ot`,
        driveId: drive.id,
        company: drive.companyName,
        role: drive.role,
        type: 'Online Test',
        date: drive.ot,
        icon: '💻',
      })
    }

    if (drive.interview) {
      events.push({
        id: `${drive.id}-interview`,
        driveId: drive.id,
        company: drive.companyName,
        role: drive.role,
        type: 'Interview',
        date: drive.interview,
        icon: '🎯',
      })
    }

  })

  events.sort(
    (a, b) =>
      new Date(a.date) -
      new Date(b.date)
  )

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

    if (
      type ===
      'Pre-Placement Talk'
    ) {
      return 'bg-purple-100 text-purple-700'
    }

    if (
      type ===
      'Online Test'
    ) {
      return 'bg-blue-100 text-blue-700'
    }

    if (
      type ===
      'Interview'
    ) {
      return 'bg-orange-100 text-orange-700'
    }

    return 'bg-slate-100 text-slate-700'
  }

  return (
    <div className="min-h-screen bg-slate-50">

      {/* =========================
          HEADER
      ========================= */}

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-6xl">

          <button
            onClick={() =>
              navigate('/admin')
            }
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Admin Dashboard
          </button>

          <div className="mt-4">

            <h1 className="text-2xl font-bold text-slate-900">
              Upcoming Placement Events
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              View all scheduled recruitment events across published placement drives.
            </p>

          </div>

        </div>

      </header>


      {/* =========================
          MAIN
      ========================= */}

      <main className="mx-auto max-w-6xl px-5 py-8">

        {/* Summary */}

        <section className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Total Events
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading
                ? '...'
                : events.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              scheduled recruitment events
            </p>

          </div>


          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Active Drives
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {loading
                ? '...'
                : publishedDrives.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              currently published
            </p>

          </div>


          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Interviews
            </p>

            <p className="mt-2 text-3xl font-bold text-orange-600">
              {loading
                ? '...'
                : events.filter(
                    (event) =>
                      event.type ===
                      'Interview'
                  ).length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              scheduled interviews
            </p>

          </div>

        </section>


        {/* =========================
            ERROR
        ========================= */}

        {error && (

          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">

            <p className="text-sm font-semibold text-red-700">
              Unable to load placement events
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>

          </div>

        )}


        {/* =========================
            EVENTS
        ========================= */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="font-bold text-slate-900">
              Scheduled Recruitment Events
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Events are arranged according to their scheduled date and time.
            </p>

          </div>


          {/* Loading */}

          {loading ? (

            <div className="px-6 py-14 text-center">

              <p className="text-sm text-slate-500">
                Loading placement events...
              </p>

            </div>

          ) : events.length === 0 ? (

            /* Empty state */

            <div className="px-6 py-14 text-center">

              <div className="text-4xl">
                📅
              </div>

              <p className="mt-4 text-lg font-semibold text-slate-900">
                No upcoming events
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Recruitment events will appear here when they are scheduled.
              </p>

              <button
                onClick={() =>
                  navigate(
                    '/admin/create-drive'
                  )
                }
                className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
              >
                Create Placement Drive
              </button>

            </div>

          ) : (

            /* Event list */

            <div className="divide-y divide-slate-100">

              {events.map(
                (event) => (

                  <div
                    key={event.id}
                    className="px-6 py-5"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* Event information */}

                      <div className="flex items-start gap-4">

                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                          {event.icon}
                        </div>

                        <div className="min-w-0">

                          <div className="flex flex-wrap items-center gap-2">

                            <h3 className="font-semibold text-slate-900">
                              {event.company}
                            </h3>

                            <span
                              className={`rounded-full px-3 py-1 text-xs font-semibold ${getEventStyle(
                                event.type
                              )}`}
                            >
                              {event.type}
                            </span>

                          </div>

                          <p className="mt-1 text-sm text-slate-500">
                            {event.role}
                          </p>

                          <p className="mt-2 text-sm font-medium text-slate-700">
                            📅 {formatDate(
                              event.date
                            )}
                          </p>

                        </div>

                      </div>


                      {/* Action */}

                      <button
                        onClick={() =>
                          navigate(
                            `/admin/drive/${event.driveId}`
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                      >
                        View Drive →
                      </button>

                    </div>

                  </div>

                )
              )}

            </div>

          )}

        </section>

      </main>

    </div>
  )
}

export default UpcomingEvents