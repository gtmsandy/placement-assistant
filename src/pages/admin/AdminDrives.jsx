import { useNavigate } from 'react-router-dom'
import { usePlacements } from '../../context/PlacementContext'

function AdminDrives() {
  const navigate = useNavigate()

  const {
    drives,
    loading,
    error,
  } = usePlacements()

  const publishedDrives = drives.filter(
    (drive) =>
      drive.status === 'Published'
  )

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* Header */}

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

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h1 className="text-2xl font-bold text-slate-900">
                Placement Drives
              </h1>

              <p className="mt-1 text-sm text-slate-500">
                Manage currently published placement drives.
              </p>

            </div>

            <button
              onClick={() =>
                navigate(
                  '/admin/create-drive'
                )
              }
              className="rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              + New Drive
            </button>

          </div>

        </div>

      </header>


      {/* Main */}

      <main className="mx-auto max-w-6xl px-5 py-8">

        {/* Summary */}

        <div className="mb-6 rounded-2xl bg-white p-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Active Placement Drives
          </p>

          <p className="mt-1 text-3xl font-bold text-slate-900">
            {loading
              ? '...'
              : publishedDrives.length}
          </p>

          <p className="mt-1 text-xs text-slate-400">
            currently published drives
          </p>

        </div>


        {/* Error */}

        {error && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="text-sm font-semibold text-red-700">
              Unable to load placement drives
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>

          </div>

        )}


        {/* Loading */}

        {loading ? (

          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

            <p className="text-sm text-slate-500">
              Loading placement drives...
            </p>

          </div>

        ) : publishedDrives.length === 0 ? (

          <div className="rounded-2xl bg-white p-12 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              No active placement drives
            </p>

            <p className="mt-2 text-sm text-slate-500">
              There are currently no published placement drives.
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

          <div className="space-y-4">

            {publishedDrives.map(
              (drive) => (

                <div
                  key={drive.id}
                  className="rounded-2xl bg-white p-5 shadow-sm"
                >

                  <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                    {/* Drive Information */}

                    <div>

                      <div className="flex flex-wrap items-center gap-2">

                        <h2 className="text-lg font-bold text-slate-900">
                          {drive.companyName}
                        </h2>

                        <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                          Published
                        </span>

                      </div>

                      <p className="mt-2 text-sm font-medium text-slate-700">
                        {drive.role}
                      </p>

                      <div className="mt-2 flex flex-wrap gap-4 text-sm text-slate-500">

                        {drive.ctc && (
                          <span>
                            {drive.ctc}
                          </span>
                        )}

                        {drive.location && (
                          <span>
                            📍 {drive.location}
                          </span>
                        )}

                      </div>

                      {drive.resumeShortlisting && (

                        <p className="mt-3 text-xs font-medium text-blue-600">
                          Resume Shortlisting Required
                        </p>

                      )}

                    </div>


                    {/* Action */}

                    <div className="flex flex-col gap-2 sm:flex-row">

                      <button
                        onClick={() =>
                          navigate(
                            `/admin/drive/${drive.id}`
                          )
                        }
                        className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
                      >
                        View Drive →
                      </button>

                      <button
                        onClick={() =>
                          navigate(
                            `/admin/edit-drive/${drive.id}`
                          )
                        }
                        className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Edit
                      </button>

                    </div>

                  </div>

                </div>

              )
            )}

          </div>

        )}

      </main>

    </div>
  )
}

export default AdminDrives