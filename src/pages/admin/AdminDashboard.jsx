import { useNavigate } from 'react-router-dom'
import { usePlacements } from '../../context/PlacementContext'

function AdminDashboard() {
  const navigate = useNavigate()
  const { drives } = usePlacements()

  return (
    <div className="min-h-screen bg-slate-50">
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
            onClick={() => navigate('/admin/create-drive')}
            className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
          >
            + New Drive
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Active Drives
            </p>

            <p className="mt-2 text-3xl font-bold">
              {drives.length}
            </p>

            <p className="mt-1 text-xs text-slate-400">
              placement drives
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Upcoming Events
            </p>

            <p className="mt-2 text-3xl font-bold">
              8
            </p>

            <p className="mt-1 text-xs text-slate-400">
              scheduled events
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Applications
            </p>

            <p className="mt-2 text-3xl font-bold">
              824
            </p>

            <p className="mt-1 text-xs text-slate-400">
              student applications
            </p>
          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">
            <p className="text-sm text-slate-500">
              Selected
            </p>

            <p className="mt-2 text-3xl font-bold">
              27
            </p>

            <p className="mt-1 text-xs text-slate-400">
              selected students
            </p>
          </div>

        </section>

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>
              <h2 className="font-bold text-slate-900">
                Recent Placement Drives
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Manage your current recruitment drives.
              </p>
            </div>

            <button
              onClick={() => navigate('/admin/create-drive')}
              className="text-sm font-semibold text-blue-600"
            >
              + Add Drive
            </button>

          </div>

          <div className="divide-y divide-slate-100">

            {drives.length === 0 ? (
              <div className="px-6 py-12 text-center">
                <p className="text-lg font-semibold text-slate-900">
                  No placement drives yet
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Create your first placement drive to get started.
                </p>

                <button
                  onClick={() => navigate('/admin/create-drive')}
                  className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create First Drive
                </button>
              </div>
            ) : (
              drives.map((drive) => (
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

                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        drive.status === 'Published'
                          ? 'bg-green-100 text-green-700'
                          : 'bg-yellow-100 text-yellow-700'
                      }`}
                    >
                      {drive.status}
                    </span>

                    <button
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
                    >
                      Manage
                    </button>

                  </div>

                </div>
              ))
            )}

          </div>

        </section>

      </main>
    </div>
  )
}

export default AdminDashboard