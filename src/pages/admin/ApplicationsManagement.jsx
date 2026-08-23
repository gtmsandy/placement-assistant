import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  getApplications,
  getDrives,
  getStudents,
  updateApplication,
} from '../../services/api'


function ApplicationsManagement() {

  const navigate =
    useNavigate()


  const [
    applications,
    setApplications,
  ] = useState([])


  const [
    drives,
    setDrives,
  ] = useState([])


  const [
    students,
    setStudents,
  ] = useState([])


  const [
    loading,
    setLoading,
  ] = useState(true)


  const [
    updatingId,
    setUpdatingId,
  ] = useState(null)


  const [
    error,
    setError,
  ] = useState('')


  const loadData =
    async () => {

      try {

        setLoading(true)
        setError('')


        const [
          applicationsData,
          drivesData,
          studentsData,
        ] =
          await Promise.all([
            getApplications(),
            getDrives(),
            getStudents(),
          ])


        setApplications(
          Array.isArray(
            applicationsData
          )
            ? applicationsData
            : []
        )


        setDrives(
          Array.isArray(
            drivesData
          )
            ? drivesData
            : []
        )


        setStudents(
          Array.isArray(
            studentsData
          )
            ? studentsData
            : []
        )


      } catch (error) {

        console.error(
          'Failed to load applications:',
          error
        )


        setError(
          error.message ||
          'Failed to load application data'
        )

      } finally {

        setLoading(false)

      }

    }


  useEffect(() => {
    loadData()
  }, [])


  const getStudent =
    (studentId) => {

      return students.find(
        (student) =>
          String(
            student.id
          ) ===
          String(
            studentId
          )
      )

    }


  const getDrive =
    (driveId) => {

      return drives.find(
        (drive) =>
          String(
            drive.id
          ) ===
          String(
            driveId
          )
      )

    }


  const getStatusStyle =
    (status) => {

      if (
        status ===
        'Selected'
      ) {

        return 'bg-green-100 text-green-700'

      }


      if (
        status ===
        'Rejected'
      ) {

        return 'bg-red-100 text-red-700'

      }


      if (
        status ===
        'Shortlisted'
      ) {

        return 'bg-purple-100 text-purple-700'

      }


      return 'bg-blue-100 text-blue-700'

    }


  const getStageStyle =
    (stage) => {

      if (
        stage ===
        'Resume Shortlisting'
      ) {

        return 'bg-purple-100 text-purple-700'

      }


      if (
        stage ===
        'PPT'
      ) {

        return 'bg-indigo-100 text-indigo-700'

      }


      if (
        stage ===
        'Online Test'
      ) {

        return 'bg-blue-100 text-blue-700'

      }


      if (
        stage ===
        'Interview'
      ) {

        return 'bg-orange-100 text-orange-700'

      }


      if (
        stage ===
        'Result'
      ) {

        return 'bg-green-100 text-green-700'

      }


      return 'bg-slate-100 text-slate-700'

    }


  const getStageOptions =
    (drive) => {

      const options = [
        'Applied',
      ]


      if (
        drive?.resume_shortlisting
      ) {

        options.push(
          'Resume Shortlisting'
        )

      }


      options.push(
        'PPT',
        'Online Test',
        'Interview',
        'Result'
      )


      return options

    }


  const getCurrentStage =
    (
      application,
      drive
    ) => {

      const stage =
        application.current_stage


      const stageOptions =
        getStageOptions(
          drive
        )


      if (
        stage &&
        stageOptions.includes(
          stage
        )
      ) {

        return stage

      }


      if (
        application.status ===
        'Selected'
      ) {

        return 'Result'

      }


      if (
        application.status ===
        'Rejected'
      ) {

        return 'Result'

      }


      if (
        application.status ===
        'Shortlisted'
      ) {

        return drive?.resume_shortlisting
          ? 'Resume Shortlisting'
          : 'PPT'

      }


      return 'Applied'

    }


  const updateApplicationOnServer =
    async (
      applicationId,
      newStatus,
      newStage
    ) => {

      try {

        setUpdatingId(
          applicationId
        )

        setError('')


        const data =
          await updateApplication(
            applicationId,
            newStatus,
            newStage
          )


        const normalizedApplication = {
          ...data,

          status:
            data.status ||
            'Applied',

          current_stage:
            data.current_stage ||
            'Applied',
        }


        setApplications(
          (previousApplications) =>
            previousApplications.map(
              (application) =>
                application.id ===
                applicationId
                  ? normalizedApplication
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


  const handleStatusChange =
    (
      application,
      newStatus
    ) => {

      const drive =
        getDrive(
          application.drive_id
        )


      let newStage =
        getCurrentStage(
          application,
          drive
        )


      if (
        newStatus ===
        'Selected'
      ) {

        newStage =
          'Result'

      }


      if (
        newStatus ===
        'Rejected'
      ) {

        if (
          !newStage ||
          newStage ===
            'Applied'
        ) {

          newStage =
            drive?.resume_shortlisting
              ? 'Resume Shortlisting'
              : 'PPT'

        }

      }


      if (
        newStatus ===
        'Applied'
      ) {

        newStage =
          'Applied'

      }


      if (
        newStatus ===
        'Shortlisted'
      ) {

        if (
          !newStage ||
          newStage ===
            'Result'
        ) {

          newStage =
            drive?.resume_shortlisting
              ? 'Resume Shortlisting'
              : 'PPT'

        }

      }


      updateApplicationOnServer(
        application.id,
        newStatus,
        newStage
      )

    }


  const handleStageChange =
    (
      application,
      newStage
    ) => {

      let newStatus =
        application.status


      if (
        newStage ===
        'Applied'
      ) {

        newStatus =
          'Applied'

      }


      if (
        newStage ===
          'Resume Shortlisting' ||
        newStage ===
          'PPT' ||
        newStage ===
          'Online Test' ||
        newStage ===
          'Interview'
      ) {

        newStatus =
          'Shortlisted'

      }


      if (
        newStage ===
        'Result'
      ) {

        if (
          newStatus !==
            'Selected' &&
          newStatus !==
            'Rejected'
        ) {

          newStatus =
            'Shortlisted'

        }

      }


      updateApplicationOnServer(
        application.id,
        newStatus,
        newStage
      )

    }


  const getTimelineSteps =
    (drive) => {

      const steps = [
        {
          key: 'Applied',
          label: 'Applied',
        },
      ]


      if (
        drive?.resume_shortlisting
      ) {

        steps.push({
          key:
            'Resume Shortlisting',

          label:
            'Resume Shortlisting',
        })

      }


      steps.push(
        {
          key: 'PPT',
          label: 'PPT',
        },
        {
          key:
            'Online Test',

          label:
            'Online Test',
        },
        {
          key:
            'Interview',

          label:
            'Interview',
        },
        {
          key:
            'Result',

          label:
            'Result',
        }
      )


      return steps

    }


  const getTimelineState =
    (
      application,
      drive,
      index,
      step
    ) => {

      const currentStage =
        getCurrentStage(
          application,
          drive
        )


      const steps =
        getTimelineSteps(
          drive
        )


      const currentIndex =
        steps.findIndex(
          (item) =>
            item.key ===
            currentStage
        )


      if (
        application.status ===
        'Selected'
      ) {

        return 'completed'

      }


      if (
        application.status ===
          'Rejected' &&
        currentStage ===
          'Result' &&
        step.key ===
          'Result'
      ) {

        return 'rejected'

      }


      if (
        application.status ===
          'Rejected' &&
        index ===
          currentIndex
      ) {

        return 'rejected'

      }


      if (
        currentIndex ===
        -1
      ) {

        if (
          index === 0
        ) {

          return 'current'

        }

        return 'pending'

      }


      if (
        index <
        currentIndex
      ) {

        return 'completed'

      }


      if (
        index ===
        currentIndex
      ) {

        return 'current'

      }


      return 'pending'

    }


  const getTimelineClass =
    (state) => {

      if (
        state ===
        'completed'
      ) {

        return {
          circle:
            'bg-green-100 text-green-700',

          text:
            'text-green-700',
        }

      }


      if (
        state ===
        'current'
      ) {

        return {
          circle:
            'bg-blue-100 text-blue-700 ring-2 ring-blue-200',

          text:
            'text-blue-700',
        }

      }


      if (
        state ===
        'rejected'
      ) {

        return {
          circle:
            'bg-red-100 text-red-700',

          text:
            'text-red-700',
        }

      }


      return {
        circle:
          'bg-slate-100 text-slate-400',

        text:
          'text-slate-400',
      }

    }


  return (
    <div className="min-h-screen bg-slate-50 pb-10">

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


                const currentStage =
                  getCurrentStage(
                    application,
                    drive
                  )


                const stageOptions =
                  getStageOptions(
                    drive
                  )


                const timelineSteps =
                  getTimelineSteps(
                    drive
                  )


                return (

                  <div
                    key={
                      application.id
                    }
                    className="rounded-2xl bg-white p-6 shadow-sm"
                  >

                    <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                      <div className="min-w-0 flex-1">

                        <div className="flex flex-wrap items-center gap-3">

                          <h2 className="text-lg font-bold text-slate-900">

                            {student?.name ||
                              'Unknown Student'}

                          </h2>


                          <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">

                            Roll No:{' '}

                            {student?.roll_no ||
                              'N/A'}

                          </span>

                        </div>


                        <div className="mt-3 space-y-1 text-sm text-slate-600">

                          <p>
                            <span className="font-medium">
                              Email:
                            </span>{' '}

                            {student?.email ||
                              'N/A'}
                          </p>


                          <p>
                            <span className="font-medium">
                              Branch:
                            </span>{' '}

                            {student?.branch ||
                              'N/A'}
                          </p>


                          <p>
                            <span className="font-medium">
                              CGPA:
                            </span>{' '}

                            {student?.cgpa ??
                              'N/A'}
                          </p>

                        </div>


                        <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                            Placement Drive
                          </p>


                          <p className="mt-1 text-lg font-semibold text-slate-900">

                            {drive?.company_name ||
                              'Unknown Company'}

                          </p>


                          <p className="mt-1 text-sm text-slate-600">

                            {drive?.role ||
                              'Unknown Role'}

                            {drive?.ctc
                              ? ` • ${drive.ctc}`
                              : ''}

                          </p>

                        </div>


                        <div className="mt-5 grid gap-4 sm:grid-cols-2">

                          <div>

                            <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                              Application Status
                            </p>


                            <span
                              className={`mt-2 inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusStyle(
                                application.status
                              )}`}
                            >
                              {application.status ||
                                'Applied'}
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

                        </div>


                        <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">

                          <div className="flex flex-wrap items-center gap-2">

                            {timelineSteps.map(
                              (
                                step,
                                index
                              ) => {

                                const state =
                                  getTimelineState(
                                    application,
                                    drive,
                                    index,
                                    step
                                  )


                                const styles =
                                  getTimelineClass(
                                    state
                                  )


                                return (

                                  <div
                                    key={
                                      step.key
                                    }
                                    className="flex items-center"
                                  >

                                    <div className="flex flex-col items-center">

                                      <div
                                        className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${styles.circle}`}
                                      >
                                        {index +
                                          1}
                                      </div>


                                      <span
                                        className={`mt-1 max-w-20 text-center text-[10px] font-medium ${styles.text}`}
                                      >
                                        {
                                          step.label
                                        }
                                      </span>

                                    </div>


                                    {index <
                                      timelineSteps.length -
                                        1 && (

                                      <div className="mx-2 h-px w-6 bg-slate-200" />

                                    )}

                                  </div>

                                )

                              }
                            )}

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
                              onChange={(
                                event
                              ) =>
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
                                    key={
                                      stage
                                    }
                                    value={
                                      stage
                                    }
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
                                Change Status
                              </p>


                              <select
                                value={
                                  application.status ||
                                  'Applied'
                                }
                                disabled={
                                  updatingId ===
                                  application.id
                                }
                                onChange={(
                                  event
                                ) =>
                                  handleStatusChange(
                                    application,
                                    event.target.value
                                  )
                                }
                                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-50 sm:w-64"
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