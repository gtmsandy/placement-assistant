import { useNavigate } from 'react-router-dom'
import { useApplications } from '../../context/ApplicationContext'
import ApplicationStatus from '../../components/ApplicationStatus'

function Applications() {
  const navigate = useNavigate()
  const { applications } = useApplications()

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      <header className="border-b border-slate-200 bg-white px-5 py-5">
        <div className="mx-auto max-w-5xl">

          <button
            onClick={() => navigate('/student')}
            className="text-sm font-medium text-blue-600"
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

        {applications.length === 0 ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              No applications yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Companies you apply to will appear here.
            </p>

            <button
              onClick={() => navigate('/student')}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Browse Opportunities
            </button>

          </div>

        ) : (

          <div className="space-y-5">

            {applications.map((application) => (

              <div
                key={application.id}
                className="rounded-2xl bg-white p-5 shadow-sm"
              >

                {/* Company information */}

                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

                  <div>

                    <h2 className="text-lg font-bold text-slate-900">
                      {application.companyName}
                    </h2>

                    <p className="mt-1 text-sm text-slate-500">
                      {application.role}
                    </p>

                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-slate-500">

                      {application.ctc && (
                        <span>
                          {application.ctc}
                        </span>
                      )}

                      {application.location && (
                        <span>
                          📍 {application.location}
                        </span>
                      )}

                    </div>

                  </div>

                  {/* Current status */}

                  <div className="text-left sm:text-right">

                    <span
                      className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                        application.status === 'Selected'
                          ? 'bg-green-100 text-green-700'
                          : application.status === 'Rejected'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {application.status}
                    </span>

                    <p className="mt-2 text-xs text-slate-400">
                      Applied{' '}
                      {new Date(
                        application.appliedAt
                      ).toLocaleDateString('en-IN')}
                    </p>

                  </div>

                </div>

                {/* Application progress */}

                <ApplicationStatus
                  status={application.status}
                />

                {/* View opportunity */}

                <div className="mt-5 border-t border-slate-100 pt-4">

                  <button
                    onClick={() =>
                      navigate(
                        `/student/opportunity/${application.driveId}`
                      )
                    }
                    className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View Opportunity →
                  </button>

                </div>

              </div>

            ))}

          </div>

        )}

      </main>

    </div>
  )
}

export default Applications