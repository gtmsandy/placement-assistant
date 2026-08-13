import { createContext, useContext, useState } from 'react'

const StudentContext = createContext()

const initialStudent = {
  name: 'Sandeep',
  rollNumber: '123456',
  collegeEmail: 'sandeep@college.edu',
  mobile: '',
  personalEmail: '',

  gender: 'Male',
  speciallyAbled: false,

  tenthPercentage: 81,
  twelfthPercentage: 75,
  cgpa: 7.4,

  branch: 'CSE',
  graduationYear: '2027',

  activeBacklogs: 0,
  historyOfBacklogs: false,

  resume: null,
}

export function StudentProvider({ children }) {
  const [student, setStudent] = useState(initialStudent)

  const updateStudent = (updatedData) => {
    setStudent((previous) => ({
      ...previous,
      ...updatedData,
    }))
  }

  return (
    <StudentContext.Provider
      value={{
        student,
        updateStudent,
      }}
    >
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  return useContext(StudentContext)
}