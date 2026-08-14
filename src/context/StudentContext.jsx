import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const StudentContext = createContext()

const API_BASE_URL =
  'http://127.0.0.1:8000'

const initialStudent = {
  id: 1,

  name: 'Sandeep',
  rollNumber: 'CSE2027',

  collegeEmail:
    'sandeep@example.com',

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

function mapStudentFromApi(student) {
  return {
    id: student.id,

    name:
      student.name || '',

    rollNumber:
      student.roll_no || '',

    collegeEmail:
      student.email || '',

    mobile:
      student.mobile || '',

    personalEmail:
      student.personal_email || '',

    gender:
      student.gender || 'Male',

    speciallyAbled:
      student.specially_abled || false,

    tenthPercentage:
      student.tenth_percentage ?? '',

    twelfthPercentage:
      student.twelfth_percentage ?? '',

    cgpa:
      student.cgpa ?? '',

    branch:
      student.branch || '',

    graduationYear:
      student.graduation_year != null
        ? String(
            student.graduation_year
          )
        : '',

    activeBacklogs:
      student.active_backlogs ?? 0,

    historyOfBacklogs:
      student.history_of_backlogs ||
      false,

    resume: null,
  }
}

function mapStudentToApi(student) {
  return {
    name:
      student.name || '',

    roll_no:
      student.rollNumber || '',

    email:
      student.collegeEmail || '',

    mobile:
      student.mobile || '',

    personal_email:
      student.personalEmail || '',

    gender:
      student.gender || 'Male',

    specially_abled:
      student.speciallyAbled || false,

    tenth_percentage:
      Number(
        student.tenthPercentage
      ) || 0,

    twelfth_percentage:
      Number(
        student.twelfthPercentage
      ) || 0,

    cgpa:
      Number(student.cgpa) || 0,

    branch:
      student.branch || '',

    graduation_year:
      Number(
        student.graduationYear
      ) || 0,

    active_backlogs:
      Number(
        student.activeBacklogs
      ) || 0,

    history_of_backlogs:
      student.historyOfBacklogs ||
      false,
  }
}

export function StudentProvider({
  children,
}) {
  const [student, setStudent] =
    useState(initialStudent)

  const [loading, setLoading] =
    useState(true)

  const [error, setError] =
    useState(null)

  useEffect(() => {
    async function loadStudent() {
      try {
        setLoading(true)
        setError(null)

        const response = await fetch(
          `${API_BASE_URL}/api/students/1`
        )

        if (!response.ok) {
          throw new Error(
            'Failed to load student'
          )
        }

        const data =
          await response.json()

        setStudent(
          mapStudentFromApi(data)
        )

      } catch (error) {
        console.error(
          'Failed to load student:',
          error
        )

        setError(
          error.message ||
            'Failed to load student'
        )

        setStudent(initialStudent)
      } finally {
        setLoading(false)
      }
    }

    loadStudent()
  }, [])

  const updateStudent =
    async (updatedData) => {
      try {
        if (!student.id) {
          throw new Error(
            'Student ID is missing'
          )
        }

        const updatedStudent = {
          ...student,
          ...updatedData,
        }

        const apiStudent =
          mapStudentToApi(
            updatedStudent
          )

        const response =
          await fetch(
            `${API_BASE_URL}/api/students/${student.id}`,
            {
              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body: JSON.stringify(
                apiStudent
              ),
            }
          )

        const data =
          await response.json()

        if (!response.ok) {
          throw new Error(
            data.detail ||
              'Failed to update student'
          )
        }

        const mappedStudent =
          mapStudentFromApi(data)

        setStudent(mappedStudent)

        return mappedStudent

      } catch (error) {
        console.error(
          'Failed to update student:',
          error
        )

        setError(
          error.message ||
            'Failed to update student'
        )

        alert(
          error.message ||
            'Failed to update student profile.'
        )

        return null
      }
    }

  return (
    <StudentContext.Provider
      value={{
        student,
        updateStudent,
        loading,
        error,
      }}
    >
      {children}
    </StudentContext.Provider>
  )
}

export function useStudent() {
  return useContext(
    StudentContext
  )
}