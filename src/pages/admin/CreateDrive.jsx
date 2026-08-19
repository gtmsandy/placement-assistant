import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

import {
  createDrive,
  uploadJobDescription,
} from '../../services/api'

function CreateDrive() {
  const navigate = useNavigate()

  const [formData, setFormData] =
    useState({
      companyName: '',
      role: '',
      ctc: '',
      location: '',

      minCgpa: '',
      minTenth: '',
      minTwelfth: '',
      maxBacklogs: '',
      branches: '',
      gender: 'Any',
      graduationYear: '2027',

      resumeShortlisting: false,

      deadline: '',
      ppt: '',
      ot: '',
      interview: '',

      registrationLink: '',
      jd: null,
    })

  const [submitting, setSubmitting] =
    useState(false)

  const [error, setError] =
    useState('')

  const handleChange = (event) => {
    const {
      name,
      value,
    } = event.target

    setFormData(
      (previous) => ({
        ...previous,
        [name]: value,
      })
    )
  }

  const handleResumeShortlistingChange = (
    event
  ) => {
    setFormData(
      (previous) => ({
        ...previous,
        resumeShortlisting:
          event.target.checked,
      })
    )
  }

  const handleFileChange = (
    event
  ) => {

    const file =
      event.target.files?.[0] ||
      null

    if (!file) {
      setFormData(
        (previous) => ({
          ...previous,
          jd: null,
        })
      )

      return
    }

    if (
      file.type !==
      'application/pdf'
    ) {
      setError(
        'Only PDF files are allowed for the Job Description.'
      )

      event.target.value = ''

      setFormData(
        (previous) => ({
          ...previous,
          jd: null,
        })
      )

      return
    }

    setError('')

    setFormData(
      (previous) => ({
        ...previous,
        jd: file,
      })
    )
  }

  const handleSubmit = async (
    event
  ) => {

    event.preventDefault()

    setError('')

    if (
      formData.jd &&
      formData.jd.type !==
        'application/pdf'
    ) {
      setError(
        'Only PDF files are allowed for the Job Description.'
      )

      return
    }

    try {

      setSubmitting(true)

const drive = {
  company_name: formData.companyName,
  role: formData.role,
  ctc: formData.ctc || null,
  location: formData.location || null,

  min_cgpa: Number(formData.minCgpa) || 0,
  min_tenth: Number(formData.minTenth) || 0,
  min_twelfth: Number(formData.minTwelfth) || 0,
  max_backlogs: Number(formData.maxBacklogs) || 0,

  branches: formData.branches || null,
  gender: formData.gender || 'Any',
  graduation_year:
    Number(formData.graduationYear) || null,

  resume_shortlisting:
    Boolean(formData.resumeShortlisting),

  deadline:
    formData.deadline || null,

  ppt:
    formData.ppt || null,

  online_test:
    formData.ot || null,

  interview:
    formData.interview || null,

  registration_link:
    formData.registrationLink || null,

  jd: '',

  status: 'Published',
}

      const createdDrive =
        await createDrive(drive)

      if (
        formData.jd
      ) {

        await uploadJobDescription(
          createdDrive.id,
          formData.jd
        )

      }

      navigate(
        `/admin/drive/${createdDrive.id}`
      )

    } catch (submitError) {

      console.error(
        'Failed to create placement drive:',
        submitError
      )

      setError(
        submitError.message ||
        'Failed to create placement drive.'
      )

    } finally {

      setSubmitting(false)

    }
  }

  return (
    <div className="min-h-screen bg-slate-50">

      <header className="border-b border-slate-200 bg-white px-6 py-4">

        <button
          onClick={() =>
            navigate('/admin')
          }
          className="text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          ← Back to Dashboard
        </button>

      </header>

      <main className="mx-auto max-w-4xl px-5 py-8">

        <div className="mb-8">

          <h1 className="text-3xl font-bold text-slate-900">
            Create Placement Drive
          </h1>

          <p className="mt-2 text-slate-500">
            Add company and recruitment details.
          </p>

        </div>


        {error && (

          <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="text-sm font-semibold text-red-700">
              {error}
            </p>

          </div>

        )}


        <form
          onSubmit={handleSubmit}
          className="space-y-6"
        >

          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Company Details
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Company Name
                </label>

                <input
                  name="companyName"
                  value={
                    formData.companyName
                  }
                  onChange={
                    handleChange
                  }
                  type="text"
                  placeholder="e.g. ABC Technologies"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                  required
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Job Role
                </label>

                <input
                  name="role"
                  value={
                    formData.role
                  }
                  onChange={
                    handleChange
                  }
                  type="text"
                  placeholder="e.g. Software Engineer"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
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
                    formData.ctc
                  }
                  onChange={
                    handleChange
                  }
                  type="text"
                  placeholder="e.g. ₹12 LPA"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Location
                </label>

                <input
                  name="location"
                  value={
                    formData.location
                  }
                  onChange={
                    handleChange
                  }
                  type="text"
                  placeholder="e.g. Bangalore"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>

            </div>

          </section>


          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Eligibility Criteria
            </h2>

            <div className="mt-5 grid gap-5 md:grid-cols-2">

              <div>

                <label className="text-sm font-medium text-slate-700">
                  Minimum CGPA
                </label>

                <input
                  name="minCgpa"
                  value={
                    formData.minCgpa
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  step="0.01"
                  placeholder="e.g. 7.0"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Minimum 10th Percentage
                </label>

                <input
                  name="minTenth"
                  value={
                    formData.minTenth
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  placeholder="e.g. 60"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Minimum 12th Percentage
                </label>

                <input
                  name="minTwelfth"
                  value={
                    formData.minTwelfth
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  placeholder="e.g. 60"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Maximum Active Backlogs
                </label>

                <input
                  name="maxBacklogs"
                  value={
                    formData.maxBacklogs
                  }
                  onChange={
                    handleChange
                  }
                  type="number"
                  placeholder="e.g. 0"
                  min="0"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div className="md:col-span-2">

                <label className="text-sm font-medium text-slate-700">
                  Eligible Branches
                </label>

                <input
                  name="branches"
                  value={
                    formData.branches
                  }
                  onChange={
                    handleChange
                  }
                  type="text"
                  placeholder="e.g. CSE, IT, ECE"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Eligible Gender
                </label>

                <select
                  name="gender"
                  value={
                    formData.gender
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
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

                <select
                  name="graduationYear"
                  value={
                    formData.graduationYear
                  }
                  onChange={
                    handleChange
                  }
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 outline-none focus:border-blue-500"
                >

                  <option value="2026">
                    2026
                  </option>

                  <option value="2027">
                    2027
                  </option>

                  <option value="2028">
                    2028
                  </option>

                  <option value="2029">
                    2029
                  </option>

                  <option value="2030">
                    2030
                  </option>

                </select>

              </div>

            </div>

          </section>


          <section className="rounded-2xl bg-white p-6 shadow-sm">

            <h2 className="text-lg font-bold text-slate-900">
              Recruitment Schedule
            </h2>

            <div className="mt-5 space-y-5">

              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">

                <label className="flex cursor-pointer items-start gap-3">

                  <input
                    type="checkbox"
                    checked={
                      formData.resumeShortlisting
                    }
                    onChange={
                      handleResumeShortlistingChange
                    }
                    className="mt-1 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  />

                  <div>

                    <p className="text-sm font-semibold text-slate-900">
                      Resume Shortlisting Required
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      Enable this if the company will shortlist students based on their resumes before the next recruitment stage.
                    </p>

                  </div>

                </label>

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Registration Deadline
                </label>

                <input
                  name="deadline"
                  value={
                    formData.deadline
                  }
                  onChange={
                    handleChange
                  }
                  type="datetime-local"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Pre-Placement Talk
                </label>

                <input
                  name="ppt"
                  value={
                    formData.ppt
                  }
                  onChange={
                    handleChange
                  }
                  type="datetime-local"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Online Test / OT
                </label>

                <input
                  name="ot"
                  value={
                    formData.ot
                  }
                  onChange={
                    handleChange
                  }
                  type="datetime-local"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Interview
                </label>

                <input
                  name="interview"
                  value={
                    formData.interview
                  }
                  onChange={
                    handleChange
                  }
                  type="datetime-local"
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3"
                />

              </div>

            </div>

          </section>


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
                  name="registrationLink"
                  value={
                    formData.registrationLink
                  }
                  onChange={
                    handleChange
                  }
                  type="url"
                  placeholder="https://..."
                  className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 outline-none focus:border-blue-500"
                />

              </div>


              <div>

                <label className="text-sm font-medium text-slate-700">
                  Job Description
                </label>

                <input
                  name="jd"
                  onChange={
                    handleFileChange
                  }
                  type="file"
                  accept=".pdf,application/pdf"
                  className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3"
                />

                {formData.jd && (

                  <p className="mt-2 text-sm text-slate-500">
                    Selected:{' '}
                    {formData.jd.name}
                  </p>

                )}

                <p className="mt-2 text-xs text-slate-400">
                  PDF files only.
                </p>

              </div>

            </div>

          </section>


          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

            <button
              type="button"
              onClick={() =>
                navigate('/admin')
              }
              disabled={submitting}
              className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Cancel
            </button>


            <button
              type="submit"
              disabled={submitting}
              className="rounded-lg bg-blue-600 px-6 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {submitting
                ? 'Creating Drive...'
                : 'Create Drive'}
            </button>

          </div>

        </form>

      </main>

    </div>
  )
}

export default CreateDrive