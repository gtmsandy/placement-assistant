import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

import {
  getStudent,
  updateStudent as updateStudentApi,
  uploadResume as uploadResumeApi,
  getStoredUser,
} from '../services/api'


const StudentContext =
  createContext()


const initialStudent = {

  id: null,

  name: '',
  rollNumber: '',

  collegeEmail: '',

  mobile: '',
  personalEmail: '',

  gender: 'Male',
  speciallyAbled: false,

  tenthPercentage: '',
  twelfthPercentage: '',
  cgpa: '',

  branch: '',
  graduationYear: '',

  activeBacklogs: 0,
  historyOfBacklogs: false,

  resumeFilename: null,
  resumeUrl: null,
}


function mapStudentFromApi(
  student
) {

  return {

    id:
      student.id,

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
      student.specially_abled ||
      false,

    tenthPercentage:
      student.tenth_percentage ??
      '',

    twelfthPercentage:
      student.twelfth_percentage ??
      '',

    cgpa:
      student.cgpa ??
      '',

    branch:
      student.branch || '',

    graduationYear:
      student.graduation_year != null
        ? String(
            student.graduation_year
          )
        : '',

    activeBacklogs:
      student.active_backlogs ??
      0,

    historyOfBacklogs:
      student.history_of_backlogs ||
      false,

    resumeFilename:
      student.resume_filename ||
      null,

    resumeUrl:
      student.resume_url ||
      null,
  }
}


function mapStudentToApi(
  student
) {

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
      Boolean(
        student.speciallyAbled
      ),

    tenth_percentage:
      Number(
        student.tenthPercentage
      ) || 0,

    twelfth_percentage:
      Number(
        student.twelfthPercentage
      ) || 0,

    cgpa:
      Number(
        student.cgpa
      ) || 0,

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
      Boolean(
        student.historyOfBacklogs
      ),
  }
}


export function StudentProvider({
  children,
}) {

  const [
    student,
    setStudent,
  ] = useState(
    initialStudent
  )


  const [
    loading,
    setLoading,
  ] = useState(false)


  const [
    error,
    setError,
  ] = useState(null)


  const loadStudent =
    async () => {

      try {

        setLoading(true)
        setError(null)


        const token =
          localStorage.getItem(
            'access_token'
          )


        /*
          Do not attempt to load a student
          before authentication.
        */

        if (!token) {

          setStudent(
            initialStudent
          )

          return null

        }


        const user =
          getStoredUser()


        if (!user) {

          setStudent(
            initialStudent
          )

          return null

        }


        if (
          !user.student_id &&
          user.role !== 'admin'
        ) {

          throw new Error(
            'Student ID is missing from the logged-in user'
          )

        }


        /*
          Admin users do not have a student
          profile to load.
        */

        if (
          user.role === 'admin'
        ) {

          setStudent(
            initialStudent
          )

          return null

        }


        const data =
          await getStudent(
            user.student_id
          )


        const mappedStudent =
          mapStudentFromApi(
            data
          )

        setStudent(
          mappedStudent
        )


        return mappedStudent

      } catch (error) {

        console.error(
          'Failed to load student:',
          error
        )


        setError(
          error.message ||
          'Failed to load student'
        )


        setStudent(
          initialStudent
        )


        return null

      } finally {

        setLoading(false)

      }
    }


  useEffect(() => {

    /*
      Initial load.
    */

    loadStudent()


    /*
      React to login/logout.
    */

    const handleAuthChanged =
      () => {

        loadStudent()

      }


    window.addEventListener(
      'auth-changed',
      handleAuthChanged
    )


    return () => {

      window.removeEventListener(
        'auth-changed',
        handleAuthChanged
      )

    }

  }, [])


  const updateStudent =
    async (
      updatedData
    ) => {

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


        const data =
          await updateStudentApi(
            student.id,
            apiStudent
          )


        const mappedStudent =
          mapStudentFromApi(
            data
          )


        setStudent(
          mappedStudent
        )


        setError(null)


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


  const uploadResume =
    async (
      file
    ) => {

      try {

        if (!student.id) {

          throw new Error(
            'Student ID is missing'
          )

        }


        if (!file) {

          throw new Error(
            'Please select a resume file'
          )

        }


        const data =
          await uploadResumeApi(
            student.id,
            file
          )


        const mappedStudent =
          mapStudentFromApi(
            data
          )


        setStudent(
          mappedStudent
        )


        setError(null)


        return mappedStudent

      } catch (error) {

        console.error(
          'Failed to upload resume:',
          error
        )


        setError(
          error.message ||
          'Failed to upload resume'
        )


        alert(
          error.message ||
          'Failed to upload resume.'
        )


        return null

      }
    }


  return (
    <StudentContext.Provider
      value={{
        student,

        updateStudent,

        uploadResume,

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
