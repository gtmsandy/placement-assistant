import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

const API_BASE_URL = 'http://127.0.0.1:8000'

function ApplicationsManagement() {
  const navigate = useNavigate()

  const [applications, setApplications] = useState([])
  const [drives, setDrives] = useState([])
  const [students, setStudents] = useState([])

  const [loading, setLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')

      const [
        applicationsResponse,
        drivesResponse,
        studentsResponse,
      ] = await Promise.all([
        fetch(`${API_BASE_URL}/api/applications/`),
        fetch(`${API_BASE_URL}/api/drives/`),
        fetch(`${API_BASE_URL}/api/students/`),
      ])

      if (
        !applicationsResponse.ok ||
        !drivesResponse.ok ||
        !studentsResponse.ok
      ) {
        throw new Error(
          'Failed to load application data'
        )
      }

      const applicationsData =
        await applicationsResponse.json()

      const drivesData =
        await drivesResponse.json()

      const studentsData =
        await studentsResponse.json()

      setApplications(applicationsData)
      setDrives(drivesData)
      setStudents(studentsData)
    } catch (error) {
      console.error(
        'Failed to load applications:',
        error
      )

      setError(
        error.message ||
          'Failed to load applications'
      )
    } finally {
      setLoading(false)
    }
  }

  const getStudent = (studentId) => {
    return students.find(
      (student) =>
        student.id === studentId
    )
  }

  const getDrive = (driveId) => {
    return drives.find(
      (drive) =>
        drive.id === driveId
    )
  }

  const getStatusStyle = (status) => {
    if (status === 'Selected') {
      return 'bg-green-100 text-green-700'
    }

    if (status === 'Rejected') {
      return 'bg-red-100 text-red-700'
    }

    if (status === 'Shortlisted') {
      return 'bg-purple-100 text-purple-700'
    }

    return 'bg-blue-100 text-blue-700'
  }

  const updateStatus = async (
    applicationId,
    newStatus
  ) => {
    try {
      setUpdatingId(applicationId)
      setError('')

      const response = await fetch(
        `${API_BASE_URL}/api/applications/${applicationId}?status=${encodeURIComponent(
          newStatus
        )}`,
        {
          method: 'PATCH',
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Failed to update application status'
        )
      }

      setApplications(
        (previousApplications) =>
          previousApplications.map(
            (application) =>
              application.id ===
              applicationId
                ? data
                : application
          )
      )
    } catch (error) {
      console.error(
        'Failed to update application:',
        error
      )

      setError(
        error.message ||
          'Failed to update application status'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-6xl">

          <button
            onClick={() =>
              navigate('/admin')
            }
            className="text-sm font-medium text-blue-600"
          >
            ← Back to Admin Dashboard
          </button>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Student Applications
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Review and manage student placement applications.
          </p>

        </div>

      </header>

      <main className="mx-auto max-w-6xl px-5 py-8">

        {/* Error */}

        {error && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="font-semibold text-red-700">
              Error
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>

          </div>

        )}

        {/* Loading */}

        {loading ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-sm text-slate-500">
              Loading applications...
            </p>

          </div>

        ) : applications.length === 0 ? (

          /* Empty state */

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              No applications yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Student applications will appear here when students apply.
            </p>

          </div>

        ) : (

          /* Applications */

          <div className="space-y-5">

            {applications.map(
              (application) => {

                const student =
                  getStudent(
                    application.student_id
                  )

                const drive =
                  getDrive(
                    application.drive_id
                  )

                return (

                  <div
                    key={application.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >

                    {/* Top section */}

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

                      {/* Student */}

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Student
                        </p>

                        <h2 className="mt-1 text-xl font-bold text-slate-900">
                          {student?.name ||
                            `Student #${application.student_id}`}
                        </h2>

                        <div className="mt-2 space-y-1 text-sm text-slate-500">

                          <p>
                            Roll Number:{' '}
                            <span className="font-medium text-slate-700">
                              {student?.roll_no ||
                                'Not available'}
                            </span>
                          </p>

                          <p>
                            Branch:{' '}
                            <span className="font-medium text-slate-700">
                              {student?.branch ||
                                'Not available'}
                            </span>
                          </p>

                          <p>
                            CGPA:{' '}
                            <span className="font-medium text-slate-700">
                              {student?.cgpa ??
                                'Not available'}
                            </span>
                          </p>

                          <p>
                            Email:{' '}
                            <span className="font-medium text-slate-700">
                              {student?.email ||
                                'Not available'}
                            </span>
                          </p>

                        </div>

                      </div>

                      {/* Company */}

                      <div className="lg:text-right">

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Placement Drive
                        </p>

                        <h3 className="mt-1 text-lg font-bold text-slate-900">
                          {drive?.company_name ||
                            'Unknown Company'}
                        </h3>

                        <p className="mt-1 text-sm text-slate-500">
                          {drive?.role ||
                            'Unknown Role'}
                        </p>

                        {drive?.ctc && (

                          <p className="mt-1 text-sm font-medium text-slate-700">
                            {drive.ctc}
                          </p>

                        )}

                      </div>

                    </div>

                    {/* Divider */}

                    <div className="my-5 border-t border-slate-100" />

                    {/* Application information */}

                    <div className="grid gap-5 md:grid-cols-3">

                      {/* Applied date */}

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Applied On
                        </p>

                        <p className="mt-1 text-sm font-medium text-slate-900">
                          {application.applied_at
                            ? new Date(
                                application.applied_at
                              ).toLocaleString(
                                'en-IN'
                              )
                            : 'Not available'}
                        </p>

                      </div>

                      {/* Current status */}

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Current Status
                        </p>

                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                            application.status
                          )}`}
                        >
                          {application.status}
                        </span>

                      </div>

                      {/* Status control */}

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Update Status
                        </p>

                        <select
                          value={
                            application.status
                          }
                          disabled={
                            updatingId ===
                            application.id
                          }
                          onChange={(event) =>
                            updateStatus(
                              application.id,
                              event.target.value
                            )
                          }
                          className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >

                          <option value="Applied">
                            Applied
                          </option>

                          <option value="Shortlisted">
                            Shortlisted
                          </option>

                          <option value="Selected">
                            Selected
                          </option>

                          <option value="Rejected">
                            Rejected
                          </option>

                        </select>

                        {updatingId ===
                          application.id && (

                          <p className="mt-1 text-xs text-slate-400">
                            Updating...
                          </p>

                        )}

                      </div>

                    </div>

                    {/* View drive */}

                    {drive?.id && (

                      <div className="mt-5 border-t border-slate-100 pt-4">

                        <button
                          onClick={() =>
                            navigate(
                              `/admin/drive/${drive.id}`
                            )
                          }
                          className="text-sm font-semibold text-blue-600 hover:text-blue-700"
                        >
                          View Placement Drive →
                        </button>

                      </div>

                    )}

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

export default ApplicationsManagement