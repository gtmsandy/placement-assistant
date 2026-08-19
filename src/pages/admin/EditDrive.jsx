import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'


const API_BASE_URL =
  'http://127.0.0.1:8000'


function toDateTimeLocal(value) {

  if (!value) {
    return ''
  }

  const date =
    new Date(value)

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return ''
  }

  const year =
    date.getFullYear()

  const month =
    String(
      date.getMonth() + 1
    ).padStart(2, '0')

  const day =
    String(
      date.getDate()
    ).padStart(2, '0')

  const hours =
    String(
      date.getHours()
    ).padStart(2, '0')

  const minutes =
    String(
      date.getMinutes()
    ).padStart(2, '0')

  return `${year}-${month}-${day}T${hours}:${minutes}`
}


function EditDrive() {

  const navigate =
    useNavigate()

  const { id } =
    useParams()


  const [loading, setLoading] =
    useState(true)

  const [saving, setSaving] =
    useState(false)

  const [error, setError] =
    useState('')


  const [selectedFile, setSelectedFile] =
    useState(null)


  const [currentJdFilename, setCurrentJdFilename] =
    useState('')


  const [form, setForm] =
    useState({

      company_name: '',
      role: '',
      ctc: '',
      location: '',

      min_cgpa: '',
      min_tenth: '',
      min_twelfth: '',
      max_backlogs: '',

      branches: '',
      gender: 'Any',
      graduation_year: '',

      resume_shortlisting: false,

      deadline: '',
      ppt: '',
      online_test: '',
      interview: '',

      registration_link: '',

      status: 'Published',

    })


  useEffect(() => {

    const loadDrive =
      async () => {

        try {

          setLoading(true)
          setError('')

          const response =
            await fetch(
              `${API_BASE_URL}/api/drives/${id}`
            )

          if (!response.ok) {

            throw new Error(
              'Failed to load placement drive.'
            )

          }

          const drive =
            await response.json()


          setForm({

            company_name:
              drive.company_name ||
              '',

            role:
              drive.role ||
              '',

            ctc:
              drive.ctc ||
              '',

            location:
              drive.location ||
              '',

            min_cgpa:
              drive.min_cgpa ??
              '',

            min_tenth:
              drive.min_tenth ??
              '',

            min_twelfth:
              drive.min_twelfth ??
              '',

            max_backlogs:
              drive.max_backlogs ??
              '',

            branches:
              drive.branches ||
              '',

            gender:
              drive.gender ||
              'Any',

            graduation_year:
              drive.graduation_year ||
              '',

            resume_shortlisting:
              Boolean(
                drive.resume_shortlisting
              ),

            deadline:
              toDateTimeLocal(
                drive.deadline
              ),

            ppt:
              toDateTimeLocal(
                drive.ppt
              ),

            online_test:
              toDateTimeLocal(
                drive.online_test
              ),

            interview:
              toDateTimeLocal(
                drive.interview
              ),

            registration_link:
              drive.registration_link ||
              '',

            status:
              drive.status ||
              'Published',

          })


          setCurrentJdFilename(
            drive.jd_filename ||
            ''
          )

        } catch (error) {

          console.error(
            'Failed to load drive:',
            error
          )

          setError(
            error.message ||
              'Failed to load placement drive.'
          )

        } finally {

          setLoading(false)

        }

      }


    loadDrive()

  }, [id])


  const handleChange =
    (event) => {

      const {
        name,
        value,
        type,
        checked,
      } = event.target


      setForm(
        (previous) => ({

          ...previous,

          [name]:
            type === 'checkbox'
              ? checked
              : value,

        })
      )

    }


  const handleFileChange =
    (event) => {

      const file =
        event.target.files?.[0]


      if (!file) {

        setSelectedFile(
          null
        )

        return

      }


      if (
        file.type !==
          'application/pdf'
      ) {

        setError(
          'Only PDF files are allowed.'
        )

        event.target.value = ''

        setSelectedFile(
          null
        )

        return

      }


      setError('')

      setSelectedFile(
        file
      )

    }


  const handleSubmit =
    async (event) => {

      event.preventDefault()


      try {

        setSaving(true)
        setError('')


        if (
          !form.company_name.trim()
        ) {

          setError(
            'Company name is required.'
          )

          return

        }


        if (
          !form.role.trim()
        ) {

          setError(
            'Role is required.'
          )

          return

        }


        const payload = {

          company_name:
            form.company_name,

          role:
            form.role,

          ctc:
            form.ctc ||
            null,

          location:
            form.location ||
            null,

          min_cgpa:
            Number(
              form.min_cgpa
            ) || 0,

          min_tenth:
            Number(
              form.min_tenth
            ) || 0,

          min_twelfth:
            Number(
              form.min_twelfth
            ) || 0,

          max_backlogs:
            Number(
              form.max_backlogs
            ) || 0,

          branches:
            form.branches ||
            null,

          gender:
            form.gender ||
            'Any',

          graduation_year:
            Number(
              form.graduation_year
            ) || null,

          resume_shortlisting:
            Boolean(
              form.resume_shortlisting
            ),

          deadline:
            form.deadline ||
            null,

          ppt:
            form.ppt ||
            null,

          online_test:
            form.online_test ||
            null,

          interview:
            form.interview ||
            null,

          registration_link:
            form.registration_link ||
            null,

          status:
            form.status ||
            'Published',

        }


        const response =
          await fetch(
            `${API_BASE_URL}/api/drives/${id}`,
            {

              method: 'PATCH',

              headers: {
                'Content-Type':
                  'application/json',
              },

              body:
                JSON.stringify(
                  payload
                ),

            }
          )


        const data =
          await response.json()


        if (!response.ok) {

          throw new Error(
            data.detail ||
              'Failed to update placement drive.'
          )

        }


        if (selectedFile) {

          const formData =
            new FormData()

          formData.append(
            'file',
            selectedFile
          )


          const jdResponse =
            await fetch(
              `${API_BASE_URL}/api/drives/${id}/jd`,
              {
                method: 'POST',
                body: formData,
              }
            )


          const jdText =
            await jdResponse.text()


          let jdData = null


          try {

            jdData =
              jdText
                ? JSON.parse(
                    jdText
                  )
                : null

          } catch {

            jdData =
              jdText

          }


          if (!jdResponse.ok) {

            throw new Error(
              jdData?.detail ||
                'Drive updated, but JD upload failed.'
            )

          }

        }


        alert(
          'Placement drive updated successfully!'
        )


        navigate(
          `/admin/drive/${id}`
        )

      } catch (error) {

        console.error(
          'Failed to update drive:',
          error
        )

        setError(
          error.message ||
            'Failed to update placement drive.'
        )

      } finally {

        setSaving(false)

      }

    }


  if (loading) {

    return (

      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-3xl rounded-2xl bg-white p-10 text-center shadow-sm">

          <p className="text-sm text-slate-500">
            Loading placement drive...
          </p>

        </div>

      </div>

    )

  }


  return (

    <div className="min-h-screen bg-slate-50 pb-10">

      <header className="border-b border-slate-200 bg-white px-6 py-5">

        <div className="mx-auto max-w-3xl">

          <button
            type="button"
            onClick={() =>
              navigate(
                `/admin/drive/${id}`
              )
            }
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Drive
          </button>


          <h1 className="mt-4 text-3xl font-bold text-slate-900">
            Edit Placement Drive
          </h1>


          <p className="mt-1 text-sm text-slate-500">
            Update the recruitment information.
          </p>

        </div>

      </header>


      <main className="mx-auto max-w-3xl px-5 py-8">

        {error && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="font-semibold text-red-700">
              Unable to update drive
            </p>

            <p className="mt-1 text-sm text-red-600">
              {error}
            </p>

          </div>

        )}


        <form
          onSubmit={
            handleSubmit
          }
          className="space-y-6"
        >

          {/* COMPANY DETAILS */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Company Details
            </h2>


            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Company Name
                </label>

                <input
                  name="company_name"
                  value={
                    form.company_name
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                  required
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Role
                </label>

                <input
                  name="role"
                  value={
                    form.role
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                  required
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  CTC
                </label>

                <input
                  name="ctc"
                  value={
                    form.ctc
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="25 LPA"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Location
                </label>

                <input
                  name="location"
                  value={
                    form.location
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>

            </div>

          </section>


          {/* ELIGIBILITY */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Eligibility Criteria
            </h2>


            <div className="mt-5 grid gap-5 sm:grid-cols-2">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Minimum CGPA
                </label>

                <input
                  type="number"
                  step="0.1"
                  name="min_cgpa"
                  value={
                    form.min_cgpa
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Minimum 10th Percentage
                </label>

                <input
                  type="number"
                  step="0.1"
                  name="min_tenth"
                  value={
                    form.min_tenth
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Minimum 12th Percentage
                </label>

                <input
                  type="number"
                  step="0.1"
                  name="min_twelfth"
                  value={
                    form.min_twelfth
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Maximum Active Backlogs
                </label>

                <input
                  type="number"
                  min="0"
                  name="max_backlogs"
                  value={
                    form.max_backlogs
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Eligible Branches
                </label>

                <input
                  name="branches"
                  value={
                    form.branches
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="CSE, IT, ECE"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Gender
                </label>

                <select
                  name="gender"
                  value={
                    form.gender
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
                >

                  <option value="Any">
                    Any
                  </option>

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                </select>

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Graduation Year
                </label>

                <input
                  type="number"
                  name="graduation_year"
                  value={
                    form.graduation_year
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>

            </div>

          </section>


          {/* RECRUITMENT SCHEDULE */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Recruitment Schedule
            </h2>


            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">

              <label className="flex cursor-pointer items-start gap-3">

                <input
                  type="checkbox"
                  name="resume_shortlisting"
                  checked={
                    form.resume_shortlisting
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                />


                <span>

                  <span className="block text-sm font-semibold text-slate-900">
                    Resume Shortlisting Required
                  </span>

                  <span className="mt-1 block text-xs text-slate-500">
                    Whether resumes will be reviewed before the next recruitment stage.
                  </span>

                </span>

              </label>

            </div>


            <div className="mt-5 space-y-5">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Registration Deadline
                </label>

                <input
                  type="datetime-local"
                  name="deadline"
                  value={
                    form.deadline
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Pre-Placement Talk
                </label>

                <input
                  type="datetime-local"
                  name="ppt"
                  value={
                    form.ppt
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Online Test
                </label>

                <input
                  type="datetime-local"
                  name="online_test"
                  value={
                    form.online_test
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Interview
                </label>

                <input
                  type="datetime-local"
                  name="interview"
                  value={
                    form.interview
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>

            </div>

          </section>


          {/* REGISTRATION & DOCUMENTS */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Registration & Documents
            </h2>


            <div className="mt-5 space-y-5">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Registration Link
                </label>

                <input
                  type="url"
                  name="registration_link"
                  value={
                    form.registration_link
                  }
                  onChange={
                    handleChange
                  }
                  placeholder="https://forms.google.com/..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Job Description
                </label>


                {currentJdFilename && (

                  <div className="mt-3 rounded-lg border border-slate-200 bg-slate-50 p-4">

                    <p className="text-xs font-medium text-slate-500">
                      Current file
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-slate-800">
                      {currentJdFilename}
                    </p>

                  </div>

                )}


                <div className="mt-4">

                  <label className="text-sm font-medium text-slate-700">
                    Replace Job Description
                  </label>

                  <input
                    type="file"
                    accept=".pdf,application/pdf"
                    onChange={
                      handleFileChange
                    }
                    className="mt-2 block w-full cursor-pointer rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-700 file:mr-4 file:rounded-md file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    PDF files only. Leave this empty to keep the current JD.
                  </p>

                </div>


                {selectedFile && (

                  <div className="mt-3 rounded-lg border border-blue-200 bg-blue-50 p-4">

                    <p className="text-xs font-medium text-blue-600">
                      New file selected
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-blue-900">
                      {selectedFile.name}
                    </p>

                  </div>

                )}

              </div>

            </div>

          </section>


          {/* DRIVE STATUS */}

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Drive Status
            </h2>


            <p className="mt-1 text-sm text-slate-500">
              Change the publication state of this placement drive.
            </p>


            <select
              name="status"
              value={
                form.status
              }
              onChange={
                handleChange
              }
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 outline-none focus:border-blue-500"
            >

              <option value="Published">
                Published
              </option>

              <option value="Draft">
                Draft
              </option>

              <option value="Closed">
                Closed
              </option>

              <option value="Withdrawn">
                Withdrawn
              </option>

            </select>


            {form.status ===
              'Withdrawn' && (

              <div className="mt-4 rounded-xl border border-red-200 bg-red-50 p-4">

                <p className="text-sm font-semibold text-red-800">
                  This drive will no longer be
                  available to students.
                </p>

                <p className="mt-1 text-xs text-red-700">
                  Existing applications will be
                  preserved.
                </p>

              </div>

            )}

          </section>


          {/* BUTTONS */}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                navigate(
                  `/admin/drive/${id}`
                )
              }
              disabled={
                saving
              }
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
            >
              Cancel
            </button>


            <button
              type="submit"
              disabled={
                saving
              }
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >

              {saving
                ? 'Saving Changes...'
                : 'Save Changes'}

            </button>

          </div>

        </form>

      </main>

    </div>

  )
}


export default EditDrive