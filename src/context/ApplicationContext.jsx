import { createContext, useContext, useEffect, useState } from 'react'

const ApplicationContext = createContext()

export function ApplicationProvider({ children }) {
  const [applications, setApplications] = useState(() => {
    const savedApplications =
      localStorage.getItem('placementApplications')

    return savedApplications
      ? JSON.parse(savedApplications)
      : []
  })

  useEffect(() => {
    localStorage.setItem(
      'placementApplications',
      JSON.stringify(applications)
    )
  }, [applications])

  const applyToDrive = (drive, student) => {
    if (!drive || !student) {
      return false
    }

    const existingApplication = applications.find(
      (application) =>
        application.driveId === drive.id &&
        application.rollNumber === student.rollNumber
    )

    if (existingApplication) {
      return false
    }

    const newApplication = {
      id: Date.now().toString(),

      driveId: drive.id,

      companyName: drive.companyName || '',
      role: drive.role || '',
      ctc: drive.ctc || '',
      location: drive.location || '',

      studentName:
        student.fullName ||
        student.name ||
        '',

      rollNumber:
        student.rollNumber ||
        '',

      collegeEmail:
        student.collegeEmail ||
        '',

      personalEmail:
        student.personalEmail ||
        '',

      mobileNumber:
        student.mobileNumber ||
        '',

      gender:
        student.gender ||
        '',

      speciallyAbled:
        student.speciallyAbled ||
        false,

      tenthPercentage:
        student.tenthPercentage ||
        '',

      twelfthPercentage:
        student.twelfthPercentage ||
        '',

      cgpa:
        student.cgpa ||
        '',

      branch:
        student.branch ||
        '',

      graduationYear:
        student.graduationYear ||
        '',

      activeBacklogs:
        student.activeBacklogs ??
        student.backlogs ??
        0,

      status: 'Applied',

      appliedAt: new Date().toISOString(),

      statusHistory: [
        {
          status: 'Applied',
          date: new Date().toISOString(),
        },
      ],
    }

    setApplications((previousApplications) => [
      ...previousApplications,
      newApplication,
    ])

    return true
  }

  const getApplication = (driveId, rollNumber) => {
    return applications.find(
      (application) =>
        application.driveId === driveId &&
        application.rollNumber === rollNumber
    )
  }

  const updateApplicationStatus = (
    applicationId,
    newStatus
  ) => {
    setApplications((previousApplications) =>
      previousApplications.map((application) => {
        if (application.id !== applicationId) {
          return application
        }

        const statusHistory =
          application.statusHistory || []

        return {
          ...application,

          status: newStatus,

          statusHistory: [
            ...statusHistory,
            {
              status: newStatus,
              date: new Date().toISOString(),
            },
          ],
        }
      })
    )
  }

  const clearApplications = () => {
    setApplications([])
  }

  return (
    <ApplicationContext.Provider
      value={{
        applications,
        applyToDrive,
        getApplication,
        updateApplicationStatus,
        clearApplications,
      }}
    >
      {children}
    </ApplicationContext.Provider>
  )
}

export function useApplications() {
  return useContext(ApplicationContext)
}