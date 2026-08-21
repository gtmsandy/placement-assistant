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


/* =========================
   API → FRONTEND
========================= */

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

    /*
      IMPORTANT

      Do NOT set these to null.

      The backend returns:
      resume_filename
      resume_url
    */

    resumeFilename:
      student.resume_filename ||
      null,

    resumeUrl:
      student.resume_url ||
      null,
  }
}


/* =========================
   FRONTEND → API
========================= */

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


/* =========================
   PROVIDER
========================= */

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
  ] = useState(true)


  const [
    error,
    setError,
  ] = useState(null)


  /* =========================
     LOAD STUDENT
  ========================= */

  useEffect(() => {

    async function loadStudent() {

      try {

        setLoading(true)
        setError(null)


        const user =
          getStoredUser()


        if (!user) {

          throw new Error(
            'User is not logged in'
          )
        }


        if (!user.student_id) {

          throw new Error(
            'Student ID is missing from the logged-in user'
          )
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

      } finally {

        setLoading(false)
      }
    }


    loadStudent()

  }, [])


  /* =========================
     UPDATE PROFILE
  ========================= */

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


  /* =========================
     UPLOAD RESUME
  ========================= */

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


        /*
          Backend returns the complete
          updated StudentResponse.

          Map it and update React state.

          THIS is what keeps the resume
          visible after saving.
        */

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


/* =========================
   HOOK
========================= */

export function useStudent() {

  return useContext(
    StudentContext
  )
}