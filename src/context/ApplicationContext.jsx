import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const ApplicationContext =
  createContext()

const API_BASE_URL =
  'http://127.0.0.1:8000'


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
    async function loadApplications() {
      try {
        setLoading(true)
        setError(null)

        const response =
          await fetch(
            `${API_BASE_URL}/api/applications/`
          )

        if (!response.ok) {
          throw new Error(
            'Failed to load applications'
          )
        }

        const data =
          await response.json()

        /*
          Keep the complete application
          object returned by the backend.

          This includes:

          id
          student_id
          drive_id
          status
          current_stage
          applied_at
        */
        const normalizedApplications =
          data.map(
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

        setApplications(
          normalizedApplications
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

    loadApplications()
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

            headers: {
              'Content-Type':
                'application/json',
            },

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

      /*
        The backend now returns
        current_stage.

        For example:

        {
          status: "Applied",
          current_stage:
            "Resume Shortlisting"
        }

        or:

        {
          status: "Applied",
          current_stage:
            "Applied"
        }
      */
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


  /*
    Update both application status
    and recruitment stage.

    Example:

    status:
      Shortlisted

    currentStage:
      PPT
  */
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

      const response =
        await fetch(
          `${API_BASE_URL}/api/applications/${applicationId}?${params.toString()}`,
          {
            method: 'PATCH',
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


  /*
    Backward-compatible function.

    Existing components that only provide
    a status can continue using this.

    The stage will be preserved if the
    existing application already has one.
  */
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