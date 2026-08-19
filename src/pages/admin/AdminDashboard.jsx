import {
  useEffect,
  useState,
} from 'react'

import {
  Link,
  useNavigate,
} from 'react-router-dom'

import {
  usePlacements,
} from '../../context/PlacementContext'

import {
  useApplications,
} from '../../context/ApplicationContext'

import {
  getStudents,
} from '../../services/api'


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


  const [students, setStudents] =
    useState([])

  const [studentsLoading, setStudentsLoading] =
    useState(true)

  const [studentsError, setStudentsError] =
    useState('')

  const [showEvents, setShowEvents] =
    useState(false)

  const [showDrives, setShowDrives] =
    useState(true)

  const [showSelected, setShowSelected] =
    useState(false)


  useEffect(() => {

    async function loadStudents() {

      try {

        setStudentsLoading(true)
        setStudentsError('')

        const data =
          await getStudents()

        setStudents(data)

      } catch (error) {

        console.error(
          'Failed to load students:',
          error
        )

        setStudentsError(
          error.message ||
          'Failed to load students'
        )

      } finally {

        setStudentsLoading(false)

      }
    }

    loadStudents()

  }, [])


  const publishedDrives =
    drives.filter(
      (drive) =>
        drive.status === 'Published'
    )


  const withdrawnDrives =
    drives.filter(
      (drive) =>
        drive.status === 'Withdrawn'
    )


  const selectedApplications =
    applications.filter(
      (application) =>
        application.status === 'Selected'
    )


  const upcomingEvents =
    publishedDrives
      .flatMap((drive) => {

        const events = []


        if (drive.deadline) {

          events.push({
            id:
              `${drive.id}-deadline`,
            driveId:
              drive.id,
            company:
              drive.companyName,
            role:
              drive.role,
            type:
              'Registration Deadline',
            date:
              drive.deadline,
            icon:
              '📝',
          })

        }


        if (drive.ppt) {

          events.push({
            id:
              `${drive.id}-ppt`,
            driveId:
              drive.id,
            company:
              drive.companyName,
            role:
              drive.role,
            type:
              'PPT',
            date:
              drive.ppt,
            icon:
              '🎤',
          })

        }


        if (drive.ot) {

          events.push({
            id:
              `${drive.id}-ot`,
            driveId:
              drive.id,
            company:
              drive.companyName,
            role:
              drive.role,
            type:
              'Online Test',
            date:
              drive.ot,
            icon:
              '💻',
          })

        }


        if (drive.interview) {

          events.push({
            id:
              `${drive.id}-interview`,
            driveId:
              drive.id,
            company:
              drive.companyName,
            role:
              drive.role,
            type:
              'Interview',
            date:
              drive.interview,
            icon:
              '🎯',
          })

        }


        return events

      })
      .sort(
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
      type === 'PPT'
    ) {
      return 'bg-purple-100 text-purple-700'
    }

    if (
      type === 'Online Test'
    ) {
      return 'bg-blue-100 text-blue-700'
    }

    if (
      type === 'Interview'
    ) {
      return 'bg-orange-100 text-orange-700'
    }

    return 'bg-slate-100 text-slate-700'
  }


  const getStudent = (
    studentId
  ) => {

    return students.find(
      (student) =>
        String(student.id) ===
        String(studentId)
    )
  }


  const getDrive = (
    driveId
  ) => {

    return drives.find(
      (drive) =>
        String(drive.id) ===
        String(driveId)
    )
  }


  const openDrives = () => {

    setShowDrives(true)
    setShowEvents(false)
    setShowSelected(false)

  }


  const openEvents = () => {

    setShowEvents(true)
    setShowDrives(false)
    setShowSelected(false)

  }


  const openSelected = () => {

    setShowSelected(true)
    setShowEvents(false)
    setShowDrives(false)

  }


  return (

    <div className="min-h-screen bg-slate-50">


      <header className="border-b border-slate-200 bg-white px-5 py-5 sm:px-6">

        <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">

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
              navigate(
                '/admin/create-drive'
              )
            }
            className="w-full rounded-lg bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 sm:w-auto"
          >
            + New Drive
          </button>

        </div>

      </header>


      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">


        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">


          <button
            onClick={openDrives}
            className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md ${
              showDrives
                ? 'ring-2 ring-blue-100'
                : ''
            }`}
          >

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-sm text-slate-500">
                  Active Drives
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {drivesLoading
                    ? '...'
                    : publishedDrives.length}
                </p>

                <p className="mt-1 text-xs text-blue-600">
                  {showDrives
                    ? 'Hide drives ↑'
                    : 'View placement drives →'}
                </p>

              </div>

              <span className="text-2xl">
                🏢
              </span>

            </div>

          </button>


          <button
            onClick={openEvents}
            className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md ${
              showEvents
                ? 'ring-2 ring-blue-100'
                : ''
            }`}
          >

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-sm text-slate-500">
                  Upcoming Events
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {drivesLoading
                    ? '...'
                    : upcomingEvents.length}
                </p>

                <p className="mt-1 text-xs text-blue-600">
                  {showEvents
                    ? 'Hide events ↑'
                    : 'View events →'}
                </p>

              </div>

              <span className="text-2xl">
                📅
              </span>

            </div>

          </button>


          <button
            onClick={() =>
              navigate(
                '/admin/applications'
              )
            }
            className="rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md"
          >

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-sm text-slate-500">
                  Applications
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {applicationsLoading
                    ? '...'
                    : applications.length}
                </p>

                <p className="mt-1 text-xs text-blue-600">
                  View student applications →
                </p>

              </div>

              <span className="text-2xl">
                👨‍🎓
              </span>

            </div>

          </button>


          <button
            onClick={openSelected}
            className={`rounded-2xl bg-white p-5 text-left shadow-sm transition hover:shadow-md ${
              showSelected
                ? 'ring-2 ring-blue-100'
                : ''
            }`}
          >

            <div className="flex items-start justify-between gap-3">

              <div>

                <p className="text-sm text-slate-500">
                  Selected
                </p>

                <p className="mt-2 text-3xl font-bold text-slate-900">
                  {applicationsLoading
                    ? '...'
                    : selectedApplications.length}
                </p>

                <p className="mt-1 text-xs text-blue-600">
                  View selected →
                </p>

              </div>

              <span className="text-2xl">
                🏆
              </span>

            </div>

          </button>

        </section>


        {showDrives && (

          <section className="rounded-2xl bg-white shadow-sm">

            <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="font-bold text-slate-900">
                  Active Placement Drives
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {publishedDrives.length}{' '}
                  currently published placement drives.
                </p>

              </div>


              <button
                onClick={() =>
                  navigate(
                    '/admin/create-drive'
                  )
                }
                className="w-full rounded-lg border border-blue-200 px-4 py-2 text-sm font-semibold text-blue-600 hover:bg-blue-50 sm:w-auto"
              >
                + Add Drive
              </button>

            </div>


            {drivesLoading ? (

              <div className="p-10 text-center text-sm text-slate-500">
                Loading placement drives...
              </div>

            ) : publishedDrives.length === 0 ? (

              <div className="p-10 text-center">

                <p className="font-semibold text-slate-900">
                  No active placement drives
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Create a placement drive to get started.
                </p>

                <button
                  onClick={() =>
                    navigate(
                      '/admin/create-drive'
                    )
                  }
                  className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
                >
                  Create First Drive
                </button>

              </div>

            ) : (

              <div className="divide-y divide-slate-100">

                {publishedDrives.map(
                  (drive) => (

                    <div
                      key={drive.id}
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="min-w-0">

                        <div className="flex flex-wrap items-center gap-2">

                          <h3 className="font-semibold text-slate-900">
                            {drive.companyName}
                          </h3>

                          <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                            Published
                          </span>

                        </div>

                        <p className="mt-1 text-sm text-slate-500">
                          {drive.role}

                          {drive.ctc
                            ? ` • ${drive.ctc}`
                            : ''}
                        </p>

                        {drive.location && (

                          <p className="mt-1 text-xs text-slate-400">
                            📍 {drive.location}
                          </p>

                        )}

                        {drive.resumeShortlisting && (

                          <p className="mt-2 text-xs font-semibold text-blue-600">
                            Resume Shortlisting Required
                          </p>

                        )}

                      </div>


                      <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">

                        <button
                          onClick={() =>
                            navigate(
                              `/admin/drive/${drive.id}`
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                        >
                          View Drive →
                        </button>

                        <button
                          onClick={() =>
                            navigate(
                              `/admin/edit-drive/${drive.id}`
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                        >
                          Edit
                        </button>

                      </div>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        )}


        {showEvents && (

          <section className="rounded-2xl bg-white shadow-sm">

            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="font-bold text-slate-900">
                  Upcoming Placement Events
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {upcomingEvents.length}{' '}
                  scheduled recruitment events.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowEvents(false)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto"
              >
                Close
              </button>

            </div>


            {upcomingEvents.length === 0 ? (

              <div className="p-10 text-center text-sm text-slate-500">
                No upcoming placement events.
              </div>

            ) : (

              <div className="divide-y divide-slate-100">

                {upcomingEvents.map(
                  (event) => (

                    <div
                      key={event.id}
                      className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                    >

                      <div className="flex min-w-0 items-start gap-4">

                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-xl">
                          {event.icon}
                        </div>

                        <div className="min-w-0">

                          <h3 className="font-semibold text-slate-900">
                            {event.company}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {event.role}
                          </p>

                          <p className="mt-2 text-sm text-slate-500">
                            {formatDate(event.date)}
                          </p>

                          <span
                            className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getEventStyle(
                              event.type
                            )}`}
                          >
                            {event.type}
                          </span>

                        </div>

                      </div>


                      <button
                        onClick={() =>
                          navigate(
                            `/admin/drive/${event.driveId}`
                          )
                        }
                        className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                      >
                        View Drive →
                      </button>

                    </div>

                  )
                )}

              </div>

            )}

          </section>

        )}


        {showSelected && (

          <section className="rounded-2xl bg-white shadow-sm">

            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="font-bold text-slate-900">
                  Selected Students
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedApplications.length}{' '}
                  selected student
                  {selectedApplications.length !== 1
                    ? 's'
                    : ''}.
                </p>

              </div>

              <button
                onClick={() =>
                  setShowSelected(false)
                }
                className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50 sm:w-auto"
              >
                Close
              </button>

            </div>


            {studentsLoading ? (

              <div className="p-10 text-center">

                <p className="text-sm text-slate-500">
                  Loading student information...
                </p>

              </div>

            ) : studentsError ? (

              <div className="p-10 text-center">

                <p className="font-semibold text-red-600">
                  Unable to load student information
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  {studentsError}
                </p>

              </div>

            ) : selectedApplications.length === 0 ? (

              <div className="p-10 text-center">

                <p className="font-semibold text-slate-900">
                  No selected students
                </p>

                <p className="mt-2 text-sm text-slate-500">
                  Students marked as selected will appear here.
                </p>

              </div>

            ) : (

              <div className="divide-y divide-slate-100">

                {selectedApplications.map(
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
                        className="px-6 py-6"
                      >

                        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">

                          <div className="min-w-0">

                            <div className="flex flex-wrap items-center gap-2">

                              <h3 className="text-lg font-bold text-slate-900">
                                {student?.name ||
                                  `Student #${application.student_id}`}
                              </h3>

                              <span className="rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
                                Selected
                              </span>

                            </div>

                            <div className="mt-2 grid gap-x-6 gap-y-1 text-sm text-slate-500 sm:grid-cols-2">

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


                          <div className="min-w-0 lg:text-right">

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Placement
                            </p>

                            <h4 className="mt-1 text-lg font-bold text-slate-900">
                              {drive?.companyName ||
                                'Company not available'}
                            </h4>

                            <p className="mt-1 text-sm text-slate-500">
                              {drive?.role ||
                                'Role not available'}
                            </p>

                            {drive?.ctc && (

                              <p className="mt-1 text-sm font-semibold text-slate-700">
                                {drive.ctc}
                              </p>

                            )}

                            {drive?.location && (

                              <p className="mt-1 text-xs text-slate-400">
                                📍 {drive.location}
                              </p>

                            )}

                          </div>


                          <div className="w-full lg:w-auto">

                            <button
                              onClick={() =>
                                navigate(
                                  '/admin/applications'
                                )
                              }
                              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 lg:w-auto"
                            >
                              View Application →
                            </button>

                          </div>

                        </div>

                      </div>

                    )

                  }
                )}

              </div>

            )}

          </section>

        )}


        {/* Withdrawn Drives */}

        <section className="rounded-2xl bg-white shadow-sm">

          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

            <div>

              <h2 className="font-bold text-slate-900">
                Withdrawn Drives
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                {withdrawnDrives.length}{' '}
                placement drive
                {withdrawnDrives.length !== 1
                  ? 's'
                  : ''}{' '}
                withdrawn. Existing applications are preserved.
              </p>

            </div>


            <Link
              to="/admin/withdrawn-drives"
              className="inline-flex w-full items-center justify-center rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 active:scale-[0.98] sm:w-auto"
            >
              View Withdrawn →
            </Link>

          </div>


          <div className="p-6">

            <div className="flex items-center gap-4">

              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-2xl">
                📁
              </div>

              <div>

                <p className="text-3xl font-bold text-slate-900">
                  {drivesLoading
                    ? '...'
                    : withdrawnDrives.length}
                </p>

                <p className="text-sm text-slate-500">
                  Withdrawn placement drives
                </p>

              </div>

            </div>

          </div>

        </section>


      </main>

    </div>
  )
}


export default AdminDashboard