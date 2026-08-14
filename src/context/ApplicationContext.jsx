import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const ApplicationContext = createContext()

const API_BASE_URL = 'http://127.0.0.1:8000'

export function ApplicationProvider({ children }) {
  const [applications, setApplications] = useState([])

  const [loading, setLoading] = useState(true)

  const [error, setError] = useState(null)

  useEffect(() => {
    async function loadApplications() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `${API_BASE_URL}/api/applications/`
        )

        if (!response.ok) {
          throw new Error(
            'Failed to load applications'
          )
        }

        const data = await response.json()

        setApplications(data)
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
      const response = await fetch(
        `${API_BASE_URL}/api/applications/`,
        {
          method: 'POST',

          headers: {
            'Content-Type':
              'application/json',
          },

          body: JSON.stringify({
            student_id: student.id,
            drive_id: drive.id,
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

      setApplications(
        (previousApplications) => [
          ...previousApplications,
          data,
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

  const updateApplicationStatus =
    async (
      applicationId,
      newStatus
    ) => {
      try {
        const response =
          await fetch(
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
          console.error(
            'Application status API error:',
            data
          )

          alert(
            data.detail ||
              'Unable to update application status.'
          )

          return false
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

        return true
      } catch (error) {
        console.error(
          'Failed to update application status:',
          error
        )

        alert(
          'Unable to connect to the placement server.'
        )

        return false
      }
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