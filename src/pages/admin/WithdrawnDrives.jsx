import { useNavigate } from 'react-router-dom'
import { usePlacements } from '../../context/PlacementContext'

function WithdrawnDrives() {
  const navigate = useNavigate()

  const {
    drives,
    loading,
    error,
  } = usePlacements()

  const withdrawnDrives =
    drives.filter(
      (drive) =>
        drive.status === 'Withdrawn'
    )

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
              Withdrawn Drives
            </h1>

            <p className="mt-1 text-sm text-slate-500">
              Placement drives withdrawn by the placement cell.
              Existing student applications are preserved.
            </p>

          </div>

        </div>

      </header>


      {/* =========================
          MAIN
      ========================= */}

      <main className="mx-auto max-w-6xl px-5 py-8">

        {/* Summary */}

        <section className="mb-6">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <p className="text-sm text-slate-500">
                  Withdrawn Placement Drives
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {loading
                    ? '...'
                    : withdrawnDrives.length}
                </p>

                <p className="mt-1 text-xs text-slate-400">
                  Existing applications remain preserved.
                </p>

              </div>

              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-2xl">
                📁
              </div>

            </div>

          </div>

        </section>


        {/* =========================
            ERROR
        ========================= */}

        {error && (

          <div className="mb-6 rounded-2xl border border-red-200 bg-red-50 p-5">

            <p className="text-sm font-semibold text-red-700">
              Unable to load withdrawn drives
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>

          </div>

        )}


        {/* =========================
            DRIVE LIST
        ========================= */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="border-b border-slate-200 px-6 py-5">

            <h2 className="font-bold text-slate-900">
              Withdrawn Placement Drives
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              These drives are no longer available for new applications.
            </p>

          </div>


          {/* Loading */}

          {loading ? (

            <div className="px-6 py-14 text-center">

              <p className="text-sm text-slate-500">
                Loading withdrawn drives...
              </p>

            </div>

          ) : withdrawnDrives.length === 0 ? (

            /* Empty state */

            <div className="px-6 py-14 text-center">

              <div className="text-4xl">
                📁
              </div>

              <p className="mt-4 text-lg font-semibold text-slate-900">
                No withdrawn drives
              </p>

              <p className="mt-2 text-sm text-slate-500">
                Withdrawn placement drives will appear here.
              </p>

              <button
                onClick={() =>
                  navigate('/admin')
                }
                className="mt-5 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Back to Dashboard
              </button>

            </div>

          ) : (

            /* Drive list */

            <div className="divide-y divide-slate-100">

              {withdrawnDrives.map(
                (drive) => (

                  <div
                    key={drive.id}
                    className="px-6 py-6"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">

                      {/* Drive information */}

                      <div>

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="text-lg font-bold text-slate-900">
                            {drive.companyName}
                          </h3>

                          <span className="rounded-full bg-red-100 px-3 py-1 text-xs font-semibold text-red-700">
                            Withdrawn
                          </span>

                        </div>

                        <p className="mt-2 text-sm font-medium text-slate-700">
                          {drive.role}

                          {drive.ctc
                            ? ` • ${drive.ctc}`
                            : ''}
                        </p>

                        {drive.location && (

                          <p className="mt-1 text-sm text-slate-500">
                            📍 {drive.location}
                          </p>

                        )}

                        <p className="mt-3 text-xs text-slate-500">
                          This placement drive has been withdrawn.
                        </p>

                        <p className="mt-1 text-xs text-slate-500">
                          Existing student applications have been preserved.
                        </p>

                      </div>


                      {/* Actions */}

                      <div className="flex flex-col gap-2 sm:flex-row">

                        <button
                          onClick={() =>
                            navigate(
                              `/admin/drive/${drive.id}`
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:w-auto"
                        >
                          View Drive →
                        </button>

                        <button
                          onClick={() =>
                            navigate(
                              `/admin/edit-drive/${drive.id}`
                            )
                          }
                          className="w-full rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
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

        </section>

      </main>

    </div>
  )
}

export default WithdrawnDrives