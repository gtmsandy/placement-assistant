import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  getApplications,
  getStoredUser,
  getAuthHeaders,
  getAuthToken,
  API_BASE_URL,
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
  ] = useState(true)

  const [
    error,
    setError,
  ] = useState(null)


  useEffect(() => {
    let cancelled = false

    async function loadApplications() {
      try {
        setLoading(true)
        setError(null)

        if (!getAuthToken()) {
          if (!cancelled) {
            setApplications([])
          }
          return
        }

        const data =
          await getApplications()

        const user =
          getStoredUser()

        const visibleApplications =
          user?.role === 'student' &&
          user.student_id
            ? data.filter(
                (application) =>
                  String(
                    application.student_id
                  ) ===
                  String(
                    user.student_id
                  )
              )
            : data

        const normalizedApplications =
          visibleApplications.map(
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

        if (!cancelled) {
          setApplications(
            normalizedApplications
          )
        }

      } catch (error) {
        console.error(
          'Failed to load applications:',
          error
        )

        if (!cancelled) {
          setError(
            error.message ||
              'Failed to load applications'
          )
        }

      } finally {
        if (!cancelled) {
          setLoading(false)
        }
      }
    }


    const handleAuthChanged = () => {
      loadApplications()
    }


    loadApplications()

    window.addEventListener(
      'auth-changed',
      handleAuthChanged
    )


    return () => {
      cancelled = true

      window.removeEventListener(
        'auth-changed',
        handleAuthChanged
      )
    }
  }, [])


  const applyToDrive = async (
    drive,
    student
  ) => {
    if (!drive || !student) {
      return false
    }


    if (!student.id) {
      console.error(
        'Student ID is missing'
      )

      alert(
        'Student ID is missing. Please configure the student profile.'
      )

      return false
    }


    try {
      const response =
        await fetch(
          `${API_BASE_URL}/api/applications/`,
          {
            method: 'POST',

            headers:
              getAuthHeaders({
                'Content-Type':
                  'application/json',
              }),

            body: JSON.stringify({
              student_id:
                student.id,

              drive_id:
                drive.id,
            }),
          }
        )


      const data =
        await response.json()


      if (!response.ok) {
        console.error(
          'Application API error:',
          data
        )

        alert(
          data.detail ||
            'Unable to submit application.'
        )

        return false
      }


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
        (previousApplications) => [
          ...previousApplications,
          normalizedApplication,
        ]
      )


      return true

    } catch (error) {
      console.error(
        'Failed to submit application:',
        error
      )

      alert(
        'Unable to connect to the placement server.'
      )

      return false
    }
  }


  const getApplication = (
    driveId,
    studentId
  ) => {
    return applications.find(
      (application) =>
        String(
          application.drive_id
        ) === String(driveId) &&
        String(
          application.student_id
        ) === String(studentId)
    )
  }


  const updateApplication = async (
    applicationId,
    newStatus,
    newCurrentStage
  ) => {
    try {
      const params =
        new URLSearchParams()


      if (newStatus) {
        params.set(
          'status',
          newStatus
        )
      }


      if (newCurrentStage) {
        params.set(
          'current_stage',
          newCurrentStage
        )
      }


      const query =
        params.toString()


      const response =
        await fetch(
          `${API_BASE_URL}/api/applications/${applicationId}${
            query
              ? `?${query}`
              : ''
          }`,
          {
            method: 'PATCH',

            headers:
              getAuthHeaders(),
          }
        )


      const data =
        await response.json()


      if (!response.ok) {
        console.error(
          'Application update API error:',
          data
        )

        alert(
          data.detail ||
            'Unable to update application.'
        )

        return false
      }


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


      return true

    } catch (error) {
      console.error(
        'Failed to update application:',
        error
      )

      alert(
        'Unable to connect to the placement server.'
      )

      return false
    }
  }


  const updateApplicationStatus =
    async (
      applicationId,
      newStatus
    ) => {
      const existingApplication =
        applications.find(
          (application) =>
            application.id ===
            applicationId
        )


      const currentStage =
        existingApplication?.current_stage ||
        'Applied'


      return updateApplication(
        applicationId,
        newStatus,
        currentStage
      )
    }


  const clearApplications = () => {
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
