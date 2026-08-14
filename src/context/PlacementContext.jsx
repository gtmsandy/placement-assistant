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


function mapDriveFromApi(
  drive
) {
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
      drive.registration_link ||
      '',

    jd:
      drive.jd || '',

    status:
      drive.status ||
      'Published',
  }
}


function mapDriveToApi(
  drive
) {
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

    resume_shortlisting:
      Boolean(
        drive.resumeShortlisting
      ),

    deadline:
      drive.deadline ||
      null,

    ppt:
      drive.ppt ||
      null,

    online_test:
      drive.ot ||
      null,

    interview:
      drive.interview ||
      null,

    registration_link:
      drive.registrationLink ||
      '',

    /*
      The backend currently stores
      JD as text.

      If jd is a File object,
      only the filename is sent.
    */
    jd:
      typeof drive.jd ===
      'string'
        ? drive.jd
        : drive.jd?.name || '',

    status:
      drive.status ||
      'Published',
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


  useEffect(() => {
    async function loadDrives() {
      try {
        setLoading(true)
        setError(null)

        const apiDrives =
          await getDrives()

        console.log(
          'Placement drives loaded:',
          apiDrives
        )

        const mappedDrives =
          apiDrives.map(
            mapDriveFromApi
          )

        setDrives(
          mappedDrives
        )

      } catch (error) {
        console.error(
          'Failed to load placement drives:',
          error
        )

        setError(
          error.message ||
            'Failed to load placement drives'
        )

      } finally {
        setLoading(false)
      }
    }

    loadDrives()
  }, [])


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

        const mappedDrive =
          mapDriveFromApi(
            createdDrive
          )

        setDrives(
          (previous) => [
            ...previous,
            mappedDrive,
          ]
        )

        return mappedDrive

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