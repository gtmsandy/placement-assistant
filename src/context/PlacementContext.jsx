import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  getDrives,
  createDrive,
} from '../services/api'


const PlacementContext =
  createContext()


function mapDriveFromApi(drive) {
  return {
    id:
      drive.id,

    companyName:
      drive.company_name || '',

    role:
      drive.role || '',

    ctc:
      drive.ctc || '',

    location:
      drive.location || '',

    minCgpa:
      drive.min_cgpa ?? '',

    minTenth:
      drive.min_tenth ?? '',

    minTwelfth:
      drive.min_twelfth ?? '',

    maxBacklogs:
      drive.max_backlogs ?? 0,

    branches:
      drive.branches || '',

    gender:
      drive.gender || 'Any',

    graduationYear:
      drive.graduation_year
        ? String(
            drive.graduation_year
          )
        : '',

    /*
      Resume shortlisting

      Backend:
        resume_shortlisting

      Frontend:
        resumeShortlisting
    */
    resumeShortlisting:
      Boolean(
        drive.resume_shortlisting
      ),

    deadline:
      drive.deadline || '',

    ppt:
      drive.ppt || '',

    ot:
      drive.online_test || '',

    interview:
      drive.interview || '',

    registrationLink:
      drive.registration_link || '',

    /*
      Backend currently stores JD
      as text.
    */
    jd:
      drive.jd || '',

    status:
      drive.status || 'Published',
  }
}


function mapDriveToApi(drive) {
  return {
    company_name:
      drive.companyName || '',

    role:
      drive.role || '',

    ctc:
      drive.ctc || '',

    location:
      drive.location || '',

    min_cgpa:
      Number(
        drive.minCgpa
      ) || 0,

    min_tenth:
      Number(
        drive.minTenth
      ) || 0,

    min_twelfth:
      Number(
        drive.minTwelfth
      ) || 0,

    max_backlogs:
      Number(
        drive.maxBacklogs
      ) || 0,

    branches:
      drive.branches || '',

    gender:
      drive.gender || 'Any',

    graduation_year:
      Number(
        drive.graduationYear
      ) || 0,

    /*
      Frontend:
        resumeShortlisting

      Backend:
        resume_shortlisting
    */
    resume_shortlisting:
      Boolean(
        drive.resumeShortlisting
      ),

    deadline:
      drive.deadline || null,

    ppt:
      drive.ppt || null,

    online_test:
      drive.ot || null,

    interview:
      drive.interview || null,

    registration_link:
      drive.registrationLink || '',

    /*
      Backend currently stores JD
      as text.

      If a File object is supplied,
      only its filename is sent.
    */
    jd:
      typeof drive.jd === 'string'
        ? drive.jd
        : drive.jd?.name || '',

    status:
      drive.status || 'Published',
  }
}


/*
  Fetch the latest placement drives
  from the FastAPI backend and update
  the React context.

  This function is reusable after:
  - Creating a drive
  - Editing a drive
  - Withdrawing a drive
  - Republishing a drive
*/
async function fetchAndSetDrives(
  setDrives,
  setLoading,
  setError
) {
  try {
    setLoading(true)
    setError(null)

    const apiDrives =
      await getDrives()

    console.log(
      'Placement drives refreshed:',
      apiDrives
    )

    const mappedDrives =
      apiDrives.map(
        mapDriveFromApi
      )

    console.log(
      'Mapped placement drives:',
      mappedDrives
    )

    setDrives(
      mappedDrives
    )

    return mappedDrives

  } catch (error) {
    console.error(
      'Failed to load placement drives:',
      error
    )

    setError(
      error.message ||
        'Failed to load placement drives'
    )

    throw error

  } finally {
    setLoading(false)
  }
}


export function PlacementProvider({
  children,
}) {
  const [drives, setDrives] =
    useState([])

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState(null)


  /*
    Initial load.

    This runs once when the
    PlacementProvider starts.
  */
  useEffect(() => {
    fetchAndSetDrives(
      setDrives,
      setLoading,
      setError
    ).catch(() => {
      /*
        The error has already been
        stored in PlacementContext.
      */
    })
  }, [])


  /*
    Public refresh function.

    Any page/component can call:

      const { refreshDrives } =
        usePlacements()

      await refreshDrives()

    This ensures the UI always gets
    the latest backend state.
  */
  const refreshDrives =
    async () => {
      return fetchAndSetDrives(
        setDrives,
        setLoading,
        setError
      )
    }


  /*
    Create a new placement drive.
  */
  const addDrive =
    async (drive) => {
      try {
        const apiDrive =
          mapDriveToApi(drive)

        console.log(
          'Publishing drive:',
          apiDrive
        )

        const createdDrive =
          await createDrive(
            apiDrive
          )

        console.log(
          'Drive created successfully:',
          createdDrive
        )

        /*
          Instead of manually adding the
          returned drive to the existing
          React state, refresh everything
          from the backend.

          This keeps the frontend state
          synchronized with the database.
        */
        await refreshDrives()

        return mapDriveFromApi(
          createdDrive
        )

      } catch (error) {
        console.error(
          'Failed to create placement drive:',
          error
        )

        throw error
      }
    }


  return (
    <PlacementContext.Provider
      value={{
        drives,

        addDrive,

        refreshDrives,

        loading,

        error,
      }}
    >
      {children}
    </PlacementContext.Provider>
  )
}


export function usePlacements() {
  return useContext(
    PlacementContext
  )
}