import { useState } from 'react'
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

  const [showEvents, setShowEvents] =
    useState(false)

  const [showDrives, setShowDrives] =
    useState(true)

  const [showSelected, setShowSelected] =
    useState(false)

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
            id: `${drive.id}-deadline`,
            driveId: drive.id,
            company:
              drive.companyName,
            role: drive.role,
            type:
              'Registration Deadline',
            date: drive.deadline,
            icon: '📝',
          })
        }

        if (drive.ppt) {
          events.push({
            id: `${drive.id}-ppt`,
            driveId: drive.id,
            company:
              drive.companyName,
            role: drive.role,
            type: 'PPT',
            date: drive.ppt,
            icon: '🎤',
          })
        }

        if (drive.ot) {
          events.push({
            id: `${drive.id}-ot`,
            driveId: drive.id,
            company:
              drive.companyName,
            role: drive.role,
            type: 'Online Test',
            date: drive.ot,
            icon: '💻',
          })
        }

        if (drive.interview) {
          events.push({
            id: `${drive.id}-interview`,
            driveId: drive.id,
            company:
              drive.companyName,
            role: drive.role,
            type: 'Interview',
            date: drive.interview,
            icon: '🎯',
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

    if (type === 'PPT') {
      return 'bg-purple-100 text-purple-700'
    }

    if (
      type === 'Online Test'
    ) {
      return 'bg-blue-100 text-blue-700'
    }

    if (type === 'Interview') {
      return 'bg-orange-100 text-orange-700'
    }

    return 'bg-slate-100 text-slate-700'
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

        {/* Summary Cards */}

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">

          {/* Active Drives */}

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


          {/* Upcoming Events */}

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


          {/* Applications */}

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


          {/* Selected */}

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


        {/* Active Drives + Withdrawn Drives */}

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


            {/* Loading */}

            {drivesLoading ? (

              <div className="p-10 text-center text-sm text-slate-500">
                Loading placement drives...
              </div>

            ) : (

              <>

                {/* Published Drives */}

                {publishedDrives.length === 0 ? (

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


                {/* Withdrawn Drives */}

                <div className="border-t border-slate-200">

                  <div className="flex flex-col gap-3 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

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

                    <span className="w-fit rounded-full bg-slate-100 px-3 py-1 text-sm font-semibold text-slate-600">
                      {withdrawnDrives.length}
                    </span>

                  </div>


                  {withdrawnDrives.length === 0 ? (

                    <div className="border-t border-slate-100 px-6 py-8 text-center">

                      <p className="text-sm text-slate-500">
                        No withdrawn placement drives.
                      </p>

                    </div>

                  ) : (

                    <div className="divide-y divide-slate-100 border-t border-slate-100">

                      {withdrawnDrives.map(
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

                                <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                                  Withdrawn
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

                              <p className="mt-2 text-xs text-slate-500">
                                Existing student applications are preserved.
                              </p>

                            </div>


                            <div className="flex w-full sm:w-auto">

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

                            </div>

                          </div>

                        )
                      )}

                    </div>

                  )}

                </div>

              </>

            )}

          </section>

        )}


        {/* Upcoming Events */}

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
                            {formatDate(
                              event.date
                            )}
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


        {/* Selected Applications */}

        {showSelected && (

          <section className="rounded-2xl bg-white shadow-sm">

            <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-5 sm:flex-row sm:items-center sm:justify-between">

              <div>

                <h2 className="font-bold text-slate-900">
                  Selected Students
                </h2>

                <p className="mt-1 text-sm text-slate-500">
                  {selectedApplications.length}{' '}
                  selected students.
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


            {selectedApplications.length === 0 ? (

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

                    const drive =
                      drives.find(
                        (item) =>
                          String(item.id) ===
                          String(
                            application.drive_id
                          )
                      )

                    return (
                      <div
                        key={application.id}
                        className="flex flex-col gap-4 px-6 py-5 sm:flex-row sm:items-center sm:justify-between"
                      >

                        <div>

                          <h3 className="font-semibold text-slate-900">
                            Student #{application.student_id}
                          </h3>

                          <p className="mt-1 text-sm text-slate-500">
                            {drive?.companyName ||
                              'Company'}
                            {' • '}
                            {drive?.role ||
                              'Role'}
                          </p>

                        </div>

                        <button
                          onClick={() =>
                            navigate(
                              '/admin/applications'
                            )
                          }
                          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:w-auto"
                        >
                          View Application →
                        </button>

                      </div>
                    )
                  }
                )}

              </div>

            )}

          </section>

        )}

      </main>

    </div>
  )
}

export default AdminDashboard