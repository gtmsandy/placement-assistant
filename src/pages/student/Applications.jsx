import { useNavigate } from 'react-router-dom'
import { useApplications } from '../../context/ApplicationContext'
import { usePlacements } from '../../context/PlacementContext'
import ApplicationStatus from '../../components/ApplicationStatus'

function Applications() {
  const navigate = useNavigate()

  const {
    applications,
    loading,
    error,
  } = useApplications()

  const { drives } = usePlacements()

  const getDrive = (driveId) => {
    return drives.find(
      (drive) =>
        String(drive.id) ===
        String(driveId)
    )
  }

  const formatDate = (date) => {
    if (!date) {
      return 'Date not available'
    }

    const parsedDate = new Date(date)

    if (
      Number.isNaN(
        parsedDate.getTime()
      )
    ) {
      return date
    }

    return parsedDate.toLocaleDateString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      }
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-5xl">

          <button
            onClick={() =>
              navigate('/student')
            }
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            My Applications
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Track all your placement applications.
          </p>

        </div>

      </header>

      <main className="mx-auto max-w-5xl px-5 py-8">

        {/* Loading */}

        {loading ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              Loading applications...
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Fetching your applications from the placement server.
            </p>

          </div>

        ) : error ? (

          /* Error */

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-red-600">
              Unable to load applications
            </p>

            <p className="mt-2 text-sm text-slate-500">
              {error}
            </p>

          </div>

        ) : applications.length === 0 ? (

          /* Empty state */

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              No applications yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Companies you apply to will appear here.
            </p>

            <button
              onClick={() =>
                navigate('/student')
              }
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Browse Opportunities
            </button>

          </div>

        ) : (

          /* Applications */

          <div className="space-y-5">

            {applications.map(
              (application) => {

                const drive =
                  getDrive(
                    application.drive_id
                  )

                /*
                  The application belongs to
                  a specific placement drive.

                  We use that drive's
                  resumeShortlisting value
                  to construct the correct
                  application timeline.
                */
                const resumeShortlisting =
                  Boolean(
                    drive?.resumeShortlisting
                  )

                return (
                  <div
                    key={application.id}
                    className="rounded-2xl bg-white p-5 shadow-sm"
                  >

                    {/* Company information */}

                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                      <div>

                        <h2 className="text-lg font-bold text-slate-900">
                          {drive?.companyName ||
                            'Company'}
                        </h2>

                        <p className="mt-1 text-sm text-slate-500">
                          {drive?.role ||
                            'Role not available'}
                        </p>

                        <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">

                          {drive?.ctc && (
                            <span>
                              {drive.ctc}
                            </span>
                          )}

                          {drive?.location && (
                            <span>
                              📍 {drive.location}
                            </span>
                          )}

                        </div>

                      </div>

                      {/* Current status */}

                      <div className="text-left sm:text-right">

                        <span
                          className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                            application.status ===
                            'Selected'
                              ? 'bg-green-100 text-green-700'
                              : application.status ===
                                'Rejected'
                                ? 'bg-red-100 text-red-700'
                                : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {application.status}
                        </span>

                        <p className="mt-2 text-xs text-slate-400">
                          Applied{' '}
                          {formatDate(
                            application.applied_at
                          )}
                        </p>

                      </div>

                    </div>

                    {/* Resume shortlisting information */}

                    {resumeShortlisting && (
                      <div className="mt-4 rounded-xl border border-blue-100 bg-blue-50 p-3">

                        <p className="text-xs font-semibold text-blue-800">
                          Resume Shortlisting Required
                        </p>

                        <p className="mt-1 text-xs text-blue-700">
                          Your resume will be reviewed before
                          you proceed to the next recruitment stage.
                        </p>

                      </div>
                    )}

                    {/* Application progress */}

                    <div className="mt-5">

                      <ApplicationStatus
                        status={
                          application.status
                        }
                        resumeShortlisting={
                          resumeShortlisting
                        }
                      />

                    </div>

                    {/* View opportunity */}

                    <div className="mt-5 border-t border-slate-100 pt-4">

                      <button
                        onClick={() =>
                          navigate(
                            `/student/opportunity/${application.drive_id}`
                          )
                        }
                        className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                      >
                        View Opportunity →
                      </button>

                    </div>

                  </div>
                )
              }
            )}

          </div>

        )}

      </main>

    </div>
  )
}

export default Applications