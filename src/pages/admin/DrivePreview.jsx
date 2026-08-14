import { useState } from 'react'
import {
  useLocation,
  useNavigate,
} from 'react-router-dom'

import {
  usePlacements,
} from '../../context/PlacementContext'


function DrivePreview() {
  const navigate =
    useNavigate()

  const location =
    useLocation()

  const { addDrive } =
    usePlacements()

  const drive =
    location.state?.drive

  const [
    publishing,
    setPublishing,
  ] = useState(false)

  const [
    error,
    setError,
  ] = useState('')


  if (!drive) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">

          <h1 className="text-xl font-bold text-slate-900">
            No placement data found
          </h1>

          <p className="mt-2 text-sm text-slate-500">
            The placement drive information could not be loaded.
          </p>

          <button
            onClick={() =>
              navigate(
                '/admin/create-drive'
              )
            }
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white hover:bg-blue-700"
          >
            Create Placement Drive
          </button>

        </div>

      </div>
    )
  }


  const handlePublish =
    async () => {
      try {
        setPublishing(true)
        setError('')

        console.log(
          'Drive being published:',
          drive
        )

        const publishedDrive =
          await addDrive(
            drive
          )

        console.log(
          'Published drive:',
          publishedDrive
        )

        alert(
          'Drive published successfully!'
        )

        navigate('/admin')

      } catch (error) {
        console.error(
          'Failed to publish drive:',
          error
        )

        setError(
          error?.message ||
            'Failed to publish placement drive.'
        )

      } finally {
        setPublishing(false)
      }
    }


  const getJdName =
    () => {
      if (!drive.jd) {
        return ''
      }

      if (
        typeof drive.jd ===
        'string'
      ) {
        return drive.jd
      }

      return (
        drive.jd.name ||
        'Job Description'
      )
    }


  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-6 py-4">

        <div className="mx-auto max-w-3xl">

          <button
            onClick={() =>
              navigate(
                '/admin/create-drive'
              )
            }
            disabled={publishing}
            className="text-sm font-medium text-blue-600 hover:text-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            ← Edit Drive
          </button>

        </div>

      </header>


      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">

        {/* Heading */}

        <div>

          <p className="text-sm font-medium text-blue-600">
            Review Before Publishing
          </p>

          <h1 className="mt-1 text-3xl font-bold text-slate-900">
            Placement Drive Preview
          </h1>

          <p className="mt-2 text-slate-500">
            Check all information before publishing this opportunity.
          </p>

        </div>


        {/* Error */}

        {error && (

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="font-semibold text-red-700">
              Failed to publish drive
            </p>

            <p className="mt-1 break-words text-sm text-red-600">
              {error}
            </p>

          </div>

        )}


        {/* Company Details */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-start justify-between gap-4">

            <div>

              <h2 className="text-2xl font-bold text-slate-900">
                {drive.companyName ||
                  'Company Name'}
              </h2>

              <p className="mt-1 text-slate-500">
                {drive.role ||
                  'Role not specified'}
              </p>

            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
              Draft
            </span>

          </div>


          <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2">

            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-500">
                CTC
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {drive.ctc ||
                  'Not specified'}
              </p>

            </div>


            <div className="rounded-xl bg-slate-50 p-4">

              <p className="text-xs text-slate-500">
                Location
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {drive.location ||
                  'Not specified'}
              </p>

            </div>

          </div>

        </section>


        {/* Eligibility */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Eligibility Criteria
          </h2>


          <div className="mt-5 space-y-3">

            <div className="flex justify-between gap-4">

              <span className="text-sm text-slate-600">
                Minimum CGPA
              </span>

              <span className="font-semibold text-slate-900">
                {drive.minCgpa !==
                  '' &&
                drive.minCgpa !==
                  undefined
                  ? drive.minCgpa
                  : 'Not specified'}
              </span>

            </div>


            <div className="flex justify-between gap-4">

              <span className="text-sm text-slate-600">
                Minimum 10th Percentage
              </span>

              <span className="font-semibold text-slate-900">
                {drive.minTenth !==
                  '' &&
                drive.minTenth !==
                  undefined
                  ? `${drive.minTenth}%`
                  : 'Not specified'}
              </span>

            </div>


            <div className="flex justify-between gap-4">

              <span className="text-sm text-slate-600">
                Minimum 12th Percentage
              </span>

              <span className="font-semibold text-slate-900">
                {drive.minTwelfth !==
                  '' &&
                drive.minTwelfth !==
                  undefined
                  ? `${drive.minTwelfth}%`
                  : 'Not specified'}
              </span>

            </div>


            <div className="flex justify-between gap-4">

              <span className="text-sm text-slate-600">
                Maximum Active Backlogs
              </span>

              <span className="font-semibold text-slate-900">
                {drive.maxBacklogs !==
                  '' &&
                drive.maxBacklogs !==
                  undefined
                  ? drive.maxBacklogs
                  : '0'}
              </span>

            </div>


            <div className="flex justify-between gap-4">

              <span className="text-sm text-slate-600">
                Eligible Branches
              </span>

              <span className="max-w-[60%] text-right font-semibold text-slate-900">
                {drive.branches ||
                  'Not specified'}
              </span>

            </div>


            <div className="flex justify-between gap-4">

              <span className="text-sm text-slate-600">
                Eligible Gender
              </span>

              <span className="font-semibold text-slate-900">
                {drive.gender ||
                  'Any'}
              </span>

            </div>


            <div className="flex justify-between gap-4">

              <span className="text-sm text-slate-600">
                Graduation Year
              </span>

              <span className="font-semibold text-slate-900">
                {drive.graduationYear ||
                  'Not specified'}
              </span>

            </div>

          </div>

        </section>


        {/* Recruitment Schedule */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Recruitment Schedule
          </h2>


          <div className="mt-5 space-y-4">

            {/* Resume Shortlisting */}

            <div className="rounded-xl bg-slate-50 p-4">

              <div className="flex items-center justify-between gap-4">

                <div>

                  <p className="text-sm font-semibold text-slate-900">
                    Resume Shortlisting
                  </p>

                  <p className="mt-1 text-xs text-slate-500">
                    Whether resumes will be reviewed before the next recruitment stage.
                  </p>

                </div>


                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    drive.resumeShortlisting
                      ? 'bg-purple-100 text-purple-700'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {drive.resumeShortlisting
                    ? 'Required'
                    : 'Not Required'}
                </span>

              </div>

            </div>


            {/* Deadline */}

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Registration Deadline
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.deadline ||
                  'Not specified'}
              </p>

            </div>


            {/* PPT */}

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Pre-Placement Talk
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.ppt ||
                  'Not specified'}
              </p>

            </div>


            {/* Online Test */}

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Online Test / OT
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.ot ||
                  'Not specified'}
              </p>

            </div>


            {/* Interview */}

            <div>

              <p className="text-sm font-semibold text-slate-900">
                Interview
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.interview ||
                  'Not specified'}
              </p>

            </div>

          </div>

        </section>


        {/* Registration & Documents */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Registration & Documents
          </h2>


          <div className="mt-4 space-y-5">

            {/* Registration Link */}

            <div>

              <p className="text-sm font-medium text-slate-600">
                Registration Link
              </p>

              {drive.registrationLink ? (

                <a
                  href={
                    drive.registrationLink
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm font-medium text-blue-600 hover:text-blue-700 hover:underline"
                >
                  {drive.registrationLink}
                </a>

              ) : (

                <p className="mt-1 text-sm text-slate-500">
                  Not provided
                </p>

              )}

            </div>


            {/* JD */}

            <div>

              <p className="text-sm font-medium text-slate-600">
                Job Description
              </p>

              {drive.jd ? (

                <div className="mt-2 rounded-xl bg-slate-50 p-4">

                  <div className="flex items-center justify-between gap-4">

                    <div className="min-w-0">

                      <p className="font-medium text-slate-900">
                        📄 {getJdName()}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        JD attached. File viewing will be available after file storage is connected.
                      </p>

                    </div>

                    <span className="shrink-0 rounded-lg bg-green-100 px-3 py-2 text-xs font-semibold text-green-700">
                      Attached
                    </span>

                  </div>

                </div>

              ) : (

                <p className="mt-1 text-sm text-slate-500">
                  No JD uploaded
                </p>

              )}

            </div>

          </div>

        </section>


        {/* Buttons */}

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">

          <button
            onClick={() =>
              navigate(
                '/admin/create-drive'
              )
            }
            disabled={publishing}
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Edit
          </button>


          <button
            onClick={
              handlePublish
            }
            disabled={publishing}
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {publishing
              ? 'Publishing...'
              : 'Publish Drive'}
          </button>

        </div>

      </main>

    </div>
  )
}


export default DrivePreview