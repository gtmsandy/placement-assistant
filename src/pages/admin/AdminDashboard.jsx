import { useNavigate } from 'react-router-dom'
import { usePlacements } from '../../context/PlacementContext'
import { useApplications } from '../../context/ApplicationContext'

function AdminDashboard() {
  const navigate = useNavigate()

  const {
    drives,
    loading: drivesLoading,
  } = usePlacements()

  const {
    applications,
    loading: applicationsLoading,
  } = useApplications()

  const publishedDrives = drives.filter(
    (drive) => drive.status === 'Published'
  )

  const upcomingEvents = publishedDrives.reduce(
    (total, drive) => {
      if (drive.deadline) {
        total += 1
      }

      if (drive.ppt) {
        total += 1
      }

      if (drive.ot) {
        total += 1
      }

      if (drive.interview) {
        total += 1
      }

      return total
    },
    0
  )

  const selectedCount = applications.filter(
    (application) =>
      application.status === 'Selected'
  ).length

  const drivesLoadingState =
    drivesLoading
      ? '...'
      : publishedDrives.length

  const applicationsLoadingState =
    applicationsLoading
      ? '...'
      : applications.length

  const selectedLoadingState =
    applicationsLoading
      ? '...'
      : selectedCount

  const eventsLoadingState =
    drivesLoading
      ? '...'
      : upcomingEvents

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-6 py-5">

        <div className="mx-auto flex max-w-6xl items-center justify-between">

          <div>

            <p className="text-sm text-slate-500">
              Placement Cell
            </p>

            <h1 className="text-2xl font-bold text-slate-900">
              Admin Dashboard
            </h1>

          </div>

          <button
            onClick={() =>
              navigate('/admin/create-drive')
            }
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New Drive
          </button>

        </div>

      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">

        {/* Summary */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Active Drives */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Active Drives
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {drivesLoadingState}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              published placement drives
            </p>

          </div>

          {/* Upcoming Events */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Upcoming Events
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {eventsLoadingState}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              scheduled events
            </p>

          </div>

          {/* Applications */}

          <button
            onClick={() =>
              navigate('/admin/applications')
            }
            className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md"
          >

            <p className="text-sm text-slate-500">
              Applications
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {applicationsLoadingState}
            </p>

            <p className="mt-1 text-xs text-blue-600">
              View student applications →
            </p>

          </button>

          {/* Selected */}

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Selected
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {selectedLoadingState}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              selected students
            </p>

          </div>

        </section>

        {/* Applications shortcut */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-bold text-slate-900">
                Student Applications
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Review students who have applied to placement drives.
              </p>

            </div>

            <button
              onClick={() =>
                navigate('/admin/applications')
              }
              className="rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              View Applications
            </button>

          </div>

        </section>

        {/* Placement Drives */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-bold text-slate-900">
                Placement Drives
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your published recruitment drives.
              </p>

            </div>

            <button
              onClick={() =>
                navigate('/admin/create-drive')
              }
              className="text-sm font-semibold text-blue-600"
            >
              + Add Drive
            </button>

          </div>

          <div className="divide-y divide-slate-100">

            {drivesLoading ? (

              <div className="px-6 py-12 text-center">

                <p className="text-sm text-slate-500">
                  Loading placement drives...
                </p>

              </div>

            ) : publishedDrives.length === 0 ? (

              <div className="px-6 py-12 text-center">

                <p className="text-lg font-semibold text-slate-900">
                  No placement drives yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first placement drive to get started.
                </p>

                <button
                  onClick={() =>
                    navigate('/admin/create-drive')
                  }
                  className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create First Drive
                </button>

              </div>

            ) : (

              publishedDrives.map(
                (drive) => (

                  <div
                    key={drive.id}
                    className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                  >

                    <div>

                      <h3 className="font-semibold text-slate-900">
                        {drive.companyName}
                      </h3>

                      <p className="mt-1 text-sm text-slate-500">
                        {drive.role}

                        {drive.ctc
                          ? ` • ${drive.ctc}`
                          : ' • CTC not specified'}
                      </p>

                      {drive.location && (

                        <p className="mt-1 text-xs text-slate-400">
                          📍 {drive.location}
                        </p>

                      )}

                    </div>

                    <div className="flex items-center gap-3">

                      <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                        Published
                      </span>

                      <button
                        onClick={() =>
                          navigate(
                            `/admin/drive/${drive.id}`
                          )
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                      >
                        View
                      </button>

                    </div>

                  </div>

                )
              )

            )}

          </div>

        </section>

      </main>

    </div>
  )
}

export default AdminDashboard