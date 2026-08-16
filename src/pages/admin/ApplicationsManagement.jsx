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
        String(student.id) ===
        String(studentId)
    )
  }

  const getDrive = (driveId) => {
    return drives.find(
      (drive) =>
        String(drive.id) ===
        String(driveId)
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

  const getStageStyle = (stage) => {
    if (stage === 'Resume Shortlisting') {
      return 'bg-purple-100 text-purple-700'
    }

    if (stage === 'PPT') {
      return 'bg-indigo-100 text-indigo-700'
    }

    if (stage === 'Online Test') {
      return 'bg-blue-100 text-blue-700'
    }

    if (stage === 'Interview') {
      return 'bg-orange-100 text-orange-700'
    }

    if (stage === 'Result') {
      return 'bg-green-100 text-green-700'
    }

    return 'bg-slate-100 text-slate-700'
  }

  const getStageOptions = (drive) => {
    const options = [
      'Applied',
    ]

    if (drive?.resume_shortlisting) {
      options.push('Resume Shortlisting')
    }

    options.push(
      'PPT',
      'Online Test',
      'Interview',
      'Result'
    )

    return options
  }

  const getDefaultStageForStatus = (
    application,
    drive
  ) => {
    if (
      application.status === 'Selected' ||
      application.status === 'Rejected'
    ) {
      return 'Result'
    }

    if (
      application.current_stage
    ) {
      return application.current_stage
    }

    if (
      application.status === 'Shortlisted'
    ) {
      if (
        drive?.resume_shortlisting
      ) {
        return 'Resume Shortlisting'
      }

      return 'PPT'
    }

    return 'Applied'
  }

  const updateApplication = async (
    applicationId,
    newStatus,
    newStage
  ) => {
    try {
      setUpdatingId(applicationId)
      setError('')

      const query = new URLSearchParams({
        status: newStatus,
        current_stage: newStage,
      })

      const response = await fetch(
        `${API_BASE_URL}/api/applications/${applicationId}?${query.toString()}`,
        {
          method: 'PATCH',
        }
      )

      const data =
        await response.json()

      if (!response.ok) {
        throw new Error(
          data.detail ||
            'Failed to update application'
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
          'Failed to update application'
      )
    } finally {
      setUpdatingId(null)
    }
  }

  const handleStatusChange = (
    application,
    newStatus
  ) => {
    const drive = getDrive(
      application.drive_id
    )

    let newStage =
      application.current_stage ||
      'Applied'

    if (
      newStatus === 'Selected' ||
      newStatus === 'Rejected'
    ) {
      newStage = 'Result'
    }

    if (
      newStatus === 'Shortlisted' &&
      (
        !newStage ||
        newStage === 'Applied' ||
        newStage === 'Result'
      )
    ) {
      newStage =
        drive?.resume_shortlisting
          ? 'Resume Shortlisting'
          : 'PPT'
    }

    updateApplication(
      application.id,
      newStatus,
      newStage
    )
  }

  const handleStageChange = (
    application,
    newStage
  ) => {
    let newStatus =
      application.status

    if (newStage === 'Result') {
      if (
        newStatus !== 'Selected' &&
        newStatus !== 'Rejected'
      ) {
        newStatus = 'Shortlisted'
      }
    }

    if (
      newStage === 'Applied'
    ) {
      newStatus = 'Applied'
    }

    if (
      newStage === 'Resume Shortlisting' ||
      newStage === 'PPT' ||
      newStage === 'Online Test' ||
      newStage === 'Interview'
    ) {
      if (
        newStatus === 'Selected' ||
        newStatus === 'Rejected'
      ) {
        newStatus = 'Shortlisted'
      }
    }

    updateApplication(
      application.id,
      newStatus,
      newStage
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

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

        {loading ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-sm text-slate-500">
              Loading applications...
            </p>

          </div>

        ) : applications.length === 0 ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              No applications yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Student applications will appear here when students apply.
            </p>

          </div>

        ) : (

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

                const stageOptions =
                  getStageOptions(drive)

                const currentStage =
                  getDefaultStageForStatus(
                    application,
                    drive
                  )

                return (

                  <div
                    key={application.id}
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >

                    <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">

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

                        {drive?.resume_shortlisting && (

                          <span className="mt-2 inline-block rounded-full bg-purple-100 px-3 py-1 text-xs font-semibold text-purple-700">
                            Resume Screening Required
                          </span>

                        )}

                      </div>

                    </div>

                    <div className="my-5 border-t border-slate-100" />

                    <div className="grid gap-5 md:grid-cols-4">

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

                      <div>

                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Current Stage
                        </p>

                        <span
                          className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStageStyle(
                            currentStage
                          )}`}
                        >
                          {currentStage}
                        </span>

                      </div>

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
                            handleStatusChange(
                              application,
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

                      </div>

                    </div>

                    <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="text-sm font-semibold text-slate-900">
                            Recruitment Stage
                          </p>

                          <p className="mt-1 text-xs text-slate-500">
                            Update the student's current position in the recruitment process.
                          </p>

                        </div>

                        <select
                          value={
                            stageOptions.includes(
                              currentStage
                            )
                              ? currentStage
                              : 'Applied'
                          }
                          disabled={
                            updatingId ===
                            application.id
                          }
                          onChange={(event) =>
                            handleStageChange(
                              application,
                              event.target.value
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-64"
                        >

                          {stageOptions.map(
                            (stage) => (

                              <option
                                key={stage}
                                value={stage}
                              >
                                {stage}
                              </option>

                            )
                          )}

                        </select>

                      </div>

                      {updatingId ===
                        application.id && (

                        <p className="mt-2 text-xs font-medium text-blue-600">
                          Updating application...
                        </p>

                      )}

                    </div>

                    <div className="mt-5 border-t border-slate-100 pt-4">

                      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">

                        <div>

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Recruitment Progress
                          </p>

                          <p className="mt-1 text-sm text-slate-600">
                            {currentStage}
                          </p>

                        </div>

                        {drive?.id && (

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

                        )}

                      </div>

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

export default ApplicationsManagement