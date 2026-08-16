import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'

const API_BASE_URL = 'http://127.0.0.1:8000'

function AdminDriveDetails() {
  const navigate = useNavigate()
  const { id } = useParams()

  const [drive, setDrive] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadDrive = async () => {
      try {
        setLoading(true)
        setError('')

        const response = await fetch(
          `${API_BASE_URL}/api/drives/${id}`
        )

        if (!response.ok) {
          throw new Error(
            'Placement drive not found.'
          )
        }

        const data = await response.json()

        console.log(
          'Admin drive details:',
          data
        )

        setDrive(data)
      } catch (error) {
        console.error(
          'Failed to load drive:',
          error
        )

        setError(
          error.message ||
            'Failed to load placement drive.'
        )
      } finally {
        setLoading(false)
      }
    }

    loadDrive()
  }, [id])

  const formatDate = (date) => {
    if (!date) {
      return 'Not specified'
    }

    const parsedDate = new Date(date)

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
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center shadow-sm">
          <p className="text-sm text-slate-500">
            Loading placement drive...
          </p>
        </div>
      </div>
    )
  }

  if (error || !drive) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">

          <h1 className="text-xl font-bold text-slate-900">
            Placement drive not found
          </h1>

          <p className="mt-2 text-sm text-red-600">
            {error ||
              'This placement drive may no longer be available.'}
          </p>

          <button
            onClick={() =>
              navigate('/admin')
            }
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Admin Dashboard
          </button>

        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      <header className="border-b border-slate-200 bg-white px-6 py-5">

        <div className="mx-auto max-w-5xl">

          <button
            onClick={() =>
              navigate('/admin')
            }
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Admin Dashboard
          </button>

          <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <p className="text-sm font-medium text-blue-600">
                Placement Drive
              </p>

              <h1 className="mt-1 text-3xl font-bold text-slate-900">
                {drive.company_name}
              </h1>

              <p className="mt-1 text-slate-500">
                {drive.role}
              </p>

            </div>

            <span
              className={`w-fit rounded-full px-3 py-1 text-xs font-semibold ${
                drive.status === 'Published'
                  ? 'bg-green-100 text-green-700'
                  : 'bg-yellow-100 text-yellow-700'
              }`}
            >
              {drive.status}
            </span>

          </div>

        </div>

      </header>

      <main className="mx-auto max-w-5xl space-y-6 px-5 py-8">

        {/* Company Details */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Company Details
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Company
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.company_name}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Role
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.role}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                CTC
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.ctc || 'Not specified'}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Location
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.location ||
                  'Not specified'}
              </p>
            </div>

          </div>

        </section>

        {/* Eligibility */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Eligibility Criteria
          </h2>

          <div className="mt-5 space-y-4">

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Minimum CGPA
              </span>

              <span className="font-semibold text-slate-900">
                {drive.min_cgpa}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Minimum 10th Percentage
              </span>

              <span className="font-semibold text-slate-900">
                {drive.min_tenth}%
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Minimum 12th Percentage
              </span>

              <span className="font-semibold text-slate-900">
                {drive.min_twelfth}%
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Maximum Active Backlogs
              </span>

              <span className="font-semibold text-slate-900">
                {drive.max_backlogs}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Eligible Branches
              </span>

              <span className="max-w-[60%] text-right font-semibold text-slate-900">
                {drive.branches ||
                  'Not specified'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Gender
              </span>

              <span className="font-semibold text-slate-900">
                {drive.gender || 'Any'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Graduation Year
              </span>

              <span className="font-semibold text-slate-900">
                {drive.graduation_year ||
                  'Any'}
              </span>
            </div>

          </div>

        </section>

        {/* Recruitment Schedule */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Recruitment Schedule
          </h2>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">

            {/* Resume Shortlisting */}

            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-xs text-slate-500">
                    Resume Shortlisting
                  </p>

                  <p className="mt-1 font-semibold text-slate-900">
                    {drive.resume_shortlisting
                      ? 'Required'
                      : 'Not Required'}
                  </p>

                </div>

                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    drive.resume_shortlisting
                      ? 'bg-blue-100 text-blue-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {drive.resume_shortlisting
                    ? 'Resume Screening'
                    : 'No Resume Screening'}
                </span>

              </div>

              {drive.resume_shortlisting && (
                <p className="mt-2 text-xs text-slate-500">
                  Resumes will be reviewed before
                  the next recruitment stage.
                </p>
              )}

            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Registration Deadline
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.deadline
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Pre-Placement Talk
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.ppt
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Online Test
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.online_test
                )}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Interview
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.interview
                )}
              </p>
            </div>

          </div>

        </section>

        {/* Registration & Documents */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Registration & Documents
          </h2>

          <div className="mt-5 space-y-5">

            <div>

              <p className="text-sm font-medium text-slate-600">
                Registration Link
              </p>

              {drive.registration_link ? (

                <a
                  href={drive.registration_link}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {drive.registration_link}
                </a>

              ) : (

                <p className="mt-1 text-sm text-slate-500">
                  Not provided
                </p>

              )}

            </div>

            <div>

              <p className="text-sm font-medium text-slate-600">
                Job Description
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.jd ||
                  'No JD uploaded'}
              </p>

              {drive.jd && (
                <p className="mt-2 text-xs text-slate-400">
                  JD file viewing will be connected to
                  file storage later.
                </p>
              )}

            </div>

          </div>

        </section>

        {/* Actions */}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">

          <button
            onClick={() =>
              navigate('/admin')
            }
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>

          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              onClick={() =>
                navigate(
                  `/admin/edit-drive/${drive.id}`
                )
              }
              className="rounded-lg border border-blue-600 bg-white px-6 py-3 font-semibold text-blue-600 hover:bg-blue-50"
            >
              Edit Drive
            </button>

            <button
              onClick={() =>
                navigate('/admin/applications')
              }
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              View Applications
            </button>

          </div>

        </div>

      </main>

    </div>
  )
}

export default AdminDriveDetails