import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const PlacementContext = createContext()

const initialDrives = [
  {
    id: 'abc-technologies',
    companyName: 'ABC Technologies',
    role: 'Software Engineer',
    ctc: '₹12 LPA',
    location: 'Bangalore',

    minCgpa: 7,
    minTenth: 60,
    minTwelfth: 60,
    maxBacklogs: 0,
    branches: 'CSE, IT, ECE',
    gender: 'Any',
    graduationYear: '2027',

    deadline: '2026-08-20T23:59',
    ppt: '2026-08-16T16:00',
    ot: '2026-08-22T10:00',
    interview: '2026-08-25T11:00',

    registrationLink: '',
    jd: null,

    status: 'Published',
  },
]

function getStoredDrives() {
  try {
    const storedDrives =
      localStorage.getItem('placement_drives')

    if (storedDrives) {
      return JSON.parse(storedDrives)
    }

    return initialDrives
  } catch (error) {
    console.error(
      'Failed to load placement drives:',
      error
    )

    return initialDrives
  }
}

export function PlacementProvider({ children }) {
  const [drives, setDrives] = useState(
    getStoredDrives
  )

  useEffect(() => {
    localStorage.setItem(
      'placement_drives',
      JSON.stringify(drives)
    )
  }, [drives])

  const addDrive = (drive) => {
    const newDrive = {
      ...drive,

      id: Date.now().toString(),

      companyName:
        drive.companyName || '',

      role:
        drive.role || '',

      ctc:
        drive.ctc || '',

      location:
        drive.location || '',

      minCgpa:
        drive.minCgpa ?? '',

      minTenth:
        drive.minTenth ?? '',

      minTwelfth:
        drive.minTwelfth ?? '',

      maxBacklogs:
        drive.maxBacklogs ?? '',

      branches:
        drive.branches || '',

      gender:
        drive.gender || 'Any',

      graduationYear:
        drive.graduationYear || '',

      deadline:
        drive.deadline || '',

      ppt:
        drive.ppt || '',

      ot:
        drive.ot || '',

      interview:
        drive.interview || '',

      registrationLink:
        drive.registrationLink || '',

      jd:
        drive.jd || null,

      status: 'Published',
    }

    setDrives((previous) => [
      ...previous,
      newDrive,
    ])

    return newDrive
  }

  return (
    <PlacementContext.Provider
      value={{
        drives,
        addDrive,
      }}
    >
      {children}
    </PlacementContext.Provider>
  )
}

export function usePlacements() {
  return useContext(PlacementContext)
}