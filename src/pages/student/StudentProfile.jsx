import {
  useEffect,
  useRef,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  useStudent,
} from '../../context/StudentContext'


function StudentProfile() {

  const navigate =
    useNavigate()


  const {
    student,
    updateStudent,
    uploadResume,
    loading,
  } = useStudent()


  const [
    formData,
    setFormData,
  ] = useState(student)


  const [
    selectedResume,
    setSelectedResume,
  ] = useState(null)


  const [
    saving,
    setSaving,
  ] = useState(false)


  const fileInputRef =
    useRef(null)


  /* =========================
     SYNC FORM WITH STUDENT
  ========================= */

  useEffect(() => {

    setFormData(student)

  }, [student])


  /* =========================
     INPUT CHANGE
  ========================= */

  const handleChange = (
    event
  ) => {

    const {
      name,
      value,
      type,
      checked,
    } = event.target


    setFormData(
      previous => ({
        ...previous,

        [name]:
          type === 'checkbox'
            ? checked
            : value,
      })
    )
  }


  /* =========================
     RESUME CHANGE
  ========================= */

  const handleResumeChange =
    event => {

      const file =
        event.target.files?.[0]


      if (!file) {
        return
      }


      const allowedTypes = [

        'application/pdf',

        'application/msword',

        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',

      ]


      const extension =
        file.name
          .split('.')
          .pop()
          ?.toLowerCase()


      if (
        !allowedTypes.includes(
          file.type
        ) &&
        ![
          'pdf',
          'doc',
          'docx',
        ].includes(extension)
      ) {

        alert(
          'Please select a PDF, DOC, or DOCX file.'
        )


        event.target.value = ''


        return
      }


      setSelectedResume(
        file
      )
    }


  /* =========================
     SAVE PROFILE
  ========================= */

  const handleSubmit =
    async event => {

      event.preventDefault()


      if (saving) {
        return
      }


      setSaving(true)


      try {

        const updatedStudent = {

          ...formData,

          tenthPercentage:
            Number(
              formData.tenthPercentage
            ),

          twelfthPercentage:
            Number(
              formData.twelfthPercentage
            ),

          cgpa:
            Number(
              formData.cgpa
            ),

          activeBacklogs:
            Number(
              formData.activeBacklogs
            ),

          graduationYear:
            String(
              formData.graduationYear
            ),
        }


        /*
          STEP 1
          Save profile information.
        */

        const profileResult =
          await updateStudent(
            updatedStudent
          )


        if (!profileResult) {
          return
        }


        /*
          STEP 2
          Upload ONLY if the user
          selected a new resume.
        */

        if (selectedResume) {

          const resumeResult =
            await uploadResume(
              selectedResume
            )


          if (!resumeResult) {
            return
          }


          /*
            Clear only the temporary
            browser file selection.

            The actual resume remains
            stored in the backend.
          */

          setSelectedResume(
            null
          )


          if (
            fileInputRef.current
          ) {

            fileInputRef.current.value =
              ''
          }
        }


        alert(
          'Profile updated successfully!'
        )

      } finally {

        setSaving(false)
      }
    }


  /* =========================
     LOADING
  ========================= */

  if (loading) {

    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">

        <div className="rounded-xl bg-white px-6 py-5 shadow-sm">

          <p className="text-sm text-slate-500">
            Loading student profile...
          </p>

        </div>

      </div>
    )
  }


  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-3xl">

          <button
            type="button"
            onClick={() =>
              navigate(
                '/student'
              )
            }
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Dashboard
          </button>


          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Student Profile
          </h1>


          <p className="mt-1 text-sm text-slate-500">
            Keep your academic and personal
            information updated.
          </p>

        </div>

      </header>


      <main className="mx-auto max-w-3xl px-5 py-8">

        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >

          {/* =========================
              PERSONAL DETAILS
          ========================= */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Personal Details
            </h2>


            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Full Name
                </label>

                <input
                  name="name"
                  value={
                    formData.name || ''
                  }
                  onChange={
                    handleChange
                  }
                  type="text"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Roll Number
                </label>

                <input
                  name="rollNumber"
                  value={
                    formData.rollNumber ||
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="text"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  College Email
                </label>

                <input
                  name="collegeEmail"
                  value={
                    formData.collegeEmail ||
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="email"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-slate-50 px-4 py-3 outline-none focus:border-blue-500"
                />

                <p className="mt-1 text-xs text-slate-400">
                  College email will be
                  verified later.
                </p>

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Mobile Number
                </label>

                <input
                  name="mobile"
                  value={
                    formData.mobile ||
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="tel"
                  placeholder="10-digit mobile number"
                  maxLength="10"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div className="md:col-span-2">

                <label className="text-sm font-medium text-slate-700">
                  Personal Email
                </label>

                <input
                  name="personalEmail"
                  value={
                    formData.personalEmail ||
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="email"
                  placeholder="yourpersonal@gmail.com"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Gender
                </label>

                <select
                  name="gender"
                  value={
                    formData.gender ||
                    'Male'
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>


              <div className="flex items-center pt-7">

                <label className="flex items-center gap-3 text-sm text-slate-700">

                  <input
                    name="speciallyAbled"
                    checked={
                      Boolean(
                        formData.speciallyAbled
                      )
                    }
                    onChange={
                      handleChange
                    }
                    type="checkbox"
                    className="h-4 w-4"
                  />

                  Specially abled / PwD

                </label>

              </div>

            </div>

          </section>


          {/* =========================
              ACADEMIC DETAILS
          ========================= */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Academic Details
            </h2>


            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  10th Percentage
                </label>

                <input
                  name="tenthPercentage"
                  value={
                    formData.tenthPercentage ??
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  12th Percentage
                </label>

                <input
                  name="twelfthPercentage"
                  value={
                    formData.twelfthPercentage ??
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  min="0"
                  max="100"
                  step="0.01"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Bachelor CGPA
                </label>

                <input
                  name="cgpa"
                  value={
                    formData.cgpa ??
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  min="0"
                  max="10"
                  step="0.01"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Branch
                </label>

                <select
                  name="branch"
                  value={
                    formData.branch ||
                    'CSE'
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >

                  <option value="CSE">
                    CSE
                  </option>

                  <option value="IT">
                    IT
                  </option>

                  <option value="ECE">
                    ECE
                  </option>

                  <option value="EEE">
                    EEE
                  </option>

                  <option value="ME">
                    Mechanical
                  </option>

                  <option value="CE">
                    Civil
                  </option>

                  <option value="Other">
                    Other
                  </option>

                </select>

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Graduation Year
                </label>

                <input
                  name="graduationYear"
                  value={
                    formData.graduationYear ??
                    ''
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Active Backlogs
                </label>

                <input
                  name="activeBacklogs"
                  value={
                    formData.activeBacklogs ??
                    0
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  min="0"
                  required
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div className="md:col-span-2">

                <label className="flex items-center gap-3 text-sm text-slate-700">

                  <input
                    name="historyOfBacklogs"
                    checked={
                      Boolean(
                        formData.historyOfBacklogs
                      )
                    }
                    onChange={
                      handleChange
                    }
                    type="checkbox"
                    className="h-4 w-4"
                  />

                  I have had backlogs in
                  the past

                </label>

              </div>

            </div>

          </section>


          {/* =========================
              RESUME
          ========================= */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Resume
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              Upload your latest resume.
            </p>


            {/* CURRENT RESUME */}

            {formData.resumeFilename && (

              <div className="mt-5 flex items-center justify-between gap-4 rounded-xl border border-green-200 bg-green-50 px-4 py-3">

                <div className="min-w-0">

                  <p className="text-xs font-medium text-green-700">
                    Current resume
                  </p>


                  <p className="mt-1 truncate text-sm font-semibold text-green-900">
                    {formData.resumeFilename}
                  </p>

                </div>


                {formData.resumeUrl && (

                  <a
                    href={`http://127.0.0.1:8000${formData.resumeUrl}`}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 text-sm font-semibold text-blue-600 hover:text-blue-700"
                  >
                    View
                  </a>

                )}

              </div>

            )}


            {/* FILE PICKER */}

            <div className="mt-5">

              <input
                ref={
                  fileInputRef
                }
                id="resume-upload"
                name="resume"
                type="file"
                accept=".pdf,.doc,.docx"
                onChange={
                  handleResumeChange
                }
                className="sr-only"
              />


              <label
                htmlFor="resume-upload"
                className="flex cursor-pointer items-center justify-between gap-4 rounded-xl border border-slate-300 bg-white px-4 py-3 transition hover:border-blue-400 hover:bg-slate-50"
              >

                <span className="min-w-0">

                  <span className="block truncate text-sm font-medium text-slate-700">

                    {selectedResume
                      ? selectedResume.name
                      : 'Choose a resume'}

                  </span>


                  <span className="mt-1 block text-xs text-slate-400">
                    PDF, DOC or DOCX
                  </span>

                </span>


                <span className="shrink-0 rounded-lg bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-600">
                  Browse
                </span>

              </label>

            </div>


            {/* NEW RESUME MESSAGE */}

            {selectedResume && (

              <p className="mt-3 text-xs font-medium text-blue-600">
                New resume selected. It will replace
                your current resume when you save.
              </p>

            )}


            {/* NO RESUME */}

            {!selectedResume &&
              !formData.resumeFilename && (

                <p className="mt-3 text-xs text-slate-400">
                  No resume uploaded yet.
                </p>

            )}

          </section>


          {/* =========================
              SAVE BUTTON
          ========================= */}

          <div className="flex justify-end">

            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving
                ? 'Saving...'
                : 'Save Profile'}

            </button>

          </div>

        </form>

      </main>

    </div>
  )
}


export default StudentProfile