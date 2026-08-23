import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  createApplication,
  getApplications,
  updateApplication as updateApplicationApi,
  getAccessToken,
} from '../services/api'


const ApplicationContext =
  createContext()


export function ApplicationProvider({
  children,
}) {
  const [
    applications,
    setApplications,
  ] = useState([])

  const [
    loading,
    setLoading,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState(null)


  const loadApplications =
    async () => {
      const token =
        getAccessToken()

      if (!token) {
        setApplications([])
        setLoading(false)
        return
      }

      try {
        setLoading(true)
        setError(null)

        const data =
          await getApplications()

        const normalized =
          Array.isArray(data)
            ? data.map(
                (application) => ({
                  ...application,

                  status:
                    application.status ||
                    'Applied',

                  current_stage:
                    application.current_stage ||
                    'Applied',
                })
              )
            : []

        setApplications(
          normalized
        )

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


  useEffect(() => {
    loadApplications()
  }, [])


  const applyToDrive =
    async (
      drive,
      student
    ) => {
      if (
        !drive ||
        !student
      ) {
        return false
      }

      if (!student.id) {
        alert(
          'Student ID is missing. Please configure the student profile.'
        )

        return false
      }

      try {
        const data =
          await createApplication(
            student.id,
            drive.id
          )

        const normalized = {
          ...data,

          status:
            data.status ||
            'Applied',

          current_stage:
            data.current_stage ||
            'Applied',
        }

        setApplications(
          (previous) => [
            ...previous,
            normalized,
          ]
        )

        return true

      } catch (error) {
        console.error(
          'Failed to submit application:',
          error
        )

        alert(
          error.message ||
          'Unable to submit application.'
        )

        return false
      }
    }


  const getApplication =
    (
      driveId,
      studentId
    ) => {
      return applications.find(
        (application) =>
          String(
            application.drive_id
          ) ===
            String(driveId) &&
          String(
            application.student_id
          ) ===
            String(studentId)
      )
    }


  const updateApplication =
    async (
      applicationId,
      newStatus,
      newCurrentStage
    ) => {
      try {
        const data =
          await updateApplicationApi(
            applicationId,
            newStatus,
            newCurrentStage
          )

        const normalized = {
          ...data,

          status:
            data.status ||
            'Applied',

          current_stage:
            data.current_stage ||
            'Applied',
        }

        setApplications(
          (previous) =>
            previous.map(
              (application) =>
                application.id ===
                applicationId
                  ? normalized
                  : application
            )
        )

        return true

      } catch (error) {
        console.error(
          'Failed to update application:',
          error
        )

        alert(
          error.message ||
          'Unable to update application.'
        )

        return false
      }
    }


  const updateApplicationStatus =
    async (
      applicationId,
      newStatus
    ) => {
      const existing =
        applications.find(
          (application) =>
            application.id ===
            applicationId
        )

      return updateApplication(
        applicationId,
        newStatus,
        existing?.current_stage ||
          'Applied'
      )
    }


  const clearApplications =
    () => {
      console.warn(
        'Applications are stored in the backend. Clear operation is not available.'
      )
    }


  return (
    <ApplicationContext.Provider
      value={{
        applications,

        applyToDrive,

        getApplication,

        updateApplication,

        updateApplicationStatus,

        clearApplications,

        loading,

        error,

        refreshApplications:
          loadApplications,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  )
}


export function useApplications() {
  return useContext(
    ApplicationContext
  )
}