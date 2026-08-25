import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
  useParams,
} from 'react-router-dom'

import {
  getDrive,
  withdrawDrive,
  uploadRoundResults,
} from '../../services/api'


const API_BASE_URL =
  'http://127.0.0.1:8000'


function AdminDriveDetails() {

  const navigate =
    useNavigate()

  const { id } =
    useParams()


  const [
    drive,
    setDrive,
  ] = useState(null)


  const [
    loading,
    setLoading,
  ] = useState(true)


  const [
    error,
    setError,
  ] = useState('')


  const [
    withdrawing,
    setWithdrawing,
  ] = useState(false)


  const [
    roundName,
    setRoundName,
  ] = useState('PPT')


  const [
    roundFile,
    setRoundFile,
  ] = useState(null)


  const [
    uploadingResults,
    setUploadingResults,
  ] = useState(false)


  const [
    uploadSuccess,
    setUploadSuccess,
  ] = useState('')


  const getNextRound =
    (currentRound) => {

      const rounds =
        drive?.resume_shortlisting
          ? [
              'Resume Shortlisting',
              'PPT',
              'Online Test',
              'Interview',
              'Result',
            ]
          : [
              'PPT',
              'Online Test',
              'Interview',
              'Result',
            ]


      const currentIndex =
        rounds.indexOf(currentRound)


      if (
        currentIndex === -1
      ) {
        return rounds[0]
      }


      if (
        currentIndex >=
        rounds.length - 1
      ) {
        return 'Result'
      }


      return rounds[
        currentIndex + 1
      ]
    }


  const getInitialRound =
    (data) => {

      if (
        data?.resume_shortlisting
      ) {
        return 'Resume Shortlisting'
      }

      return 'PPT'
    }


  const loadDrive =
    async (
      showLoading = true
    ) => {

      try {

        if (showLoading) {
          setLoading(true)
        }

        setError('')


        const data =
          await getDrive(id)


        console.log(
          'Admin drive details:',
          data
        )


        setDrive(
          data
        )


        return data

      } catch (error) {

        console.error(
          'Failed to load drive:',
          error
        )


        setError(
          error.message ||
          'Failed to load placement drive.'
        )


        throw error

      } finally {

        if (showLoading) {
          setLoading(false)
        }

      }
    }


  useEffect(() => {

    const initializeDrive =
      async () => {

        try {

          const data =
            await loadDrive()


          setRoundName(
            getInitialRound(data)
          )

        } catch {
          // Error is already handled
        }

      }


    initializeDrive()

  }, [id])


  const formatDate =
    (date) => {

      if (!date) {
        return 'Not specified'
      }


      const parsedDate =
        new Date(date)


      if (
        Number.isNaN(
          parsedDate.getTime()
        )
      ) {
        return date
      }


      return parsedDate.toLocaleString(
        'en-IN',
        {
          day:
            'numeric',

          month:
            'short',

          year:
            'numeric',

          hour:
            'numeric',

          minute:
            '2-digit',
        }
      )
    }


  const getJdUrl =
    () => {

      if (!drive?.jd) {
        return ''
      }


      if (
        drive.jd.startsWith(
          'http://'
        ) ||
        drive.jd.startsWith(
          'https://'
        )
      ) {
        return drive.jd
      }


      return (
        `${API_BASE_URL}${drive.jd}`
      )
    }


  const handleViewJd =
    () => {

      const jdUrl =
        getJdUrl()


      if (!jdUrl) {
        return
      }


      window.open(
        jdUrl,
        '_blank',
        'noopener,noreferrer'
      )
    }


  const handleRoundFileChange =
    (event) => {

      setUploadSuccess('')
      setError('')


      const file =
        event.target.files?.[0]


      if (!file) {

        setRoundFile(
          null
        )

        return
      }


      const fileName =
        file.name.toLowerCase()


      const validFile =
        fileName.endsWith(
          '.xlsx'
        ) ||
        fileName.endsWith(
          '.xlsm'
        )


      if (!validFile) {

        setRoundFile(
          null
        )

        event.target.value =
          ''


        setError(
          'Please select an Excel file (.xlsx or .xlsm).'
        )

        return
      }


      setRoundFile(
        file
      )
    }


  const handleUploadResults =
    async () => {

      if (!drive) {
        return
      }


      if (!roundFile) {

        setError(
          'Please select an Excel file first.'
        )

        return
      }


      if (!roundName) {

        setError(
          'Please select a recruitment round.'
        )

        return
      }


      try {

        setUploadingResults(
          true
        )

        setError('')
        setUploadSuccess('')


        const uploadedRound =
          roundName


        const result =
          await uploadRoundResults(
            drive.id,
            uploadedRound,
            roundFile
          )


        console.log(
          'Round results upload response:',
          result
        )


        /*
         * Reload the drive after the backend
         * has processed the Excel file.
         *
         * This ensures the frontend gets the
         * latest recruitment/application state.
         */

        const updatedDrive =
          await loadDrive(false)


        setDrive(
          updatedDrive
        )


        /*
         * Move the recruitment dropdown to
         * the next round automatically.
         */

        const nextRound =
          getNextRound(
            uploadedRound
          )


        setRoundName(
          nextRound
        )


        setUploadSuccess(
          result?.message ||
          `${uploadedRound} results processed successfully. The next recruitment round is ${nextRound}.`
        )


        setRoundFile(
          null
        )


        const fileInput =
          document.getElementById(
            'round-results-file'
          )


        if (fileInput) {
          fileInput.value =
            ''
        }


      } catch (error) {

        console.error(
          'Failed to upload round results:',
          error
        )


        setError(
          error.message ||
          'Failed to upload round results.'
        )

      } finally {

        setUploadingResults(
          false
        )

      }
    }


  const handleWithdraw =
    async () => {

      if (!drive) {
        return
      }


      const confirmed =
        window.confirm(
          `Withdraw ${drive.company_name} - ${drive.role}?\n\n` +
          `The drive will no longer be available to students.\n\n` +
          `Existing applications will be preserved.`
        )


      if (!confirmed) {
        return
      }


      try {

        setWithdrawing(
          true
        )

        setError('')


        const updatedDrive =
          await withdrawDrive(
            drive.id
          )


        setDrive(
          updatedDrive
        )


        alert(
          'Placement drive withdrawn successfully.'
        )

      } catch (error) {

        console.error(
          'Failed to withdraw drive:',
          error
        )


        setError(
          error.message ||
          'Failed to withdraw placement drive.'
        )

      } finally {

        setWithdrawing(
          false
        )

      }
    }


  if (loading) {

    return (
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-4xl rounded-2xl bg-white p-10 text-center shadow-sm">

          <p className="text-sm text-slate-500">
            Loading placement drive...
          </p>

        </div>

      </div>
    )
  }


  if (
    error &&
    !drive
  ) {

    return (
      <div className="min-h-screen bg-slate-50 p-6">

        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">

          <h1 className="text-xl font-bold text-slate-900">
            Placement drive not found
          </h1>


          <p className="mt-2 text-sm text-red-600">
            {error ||
              'This placement drive may no longer be available.'}
          </p>


          <button
            onClick={() =>
              navigate('/admin')
            }
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-semibold text-white hover:bg-blue-700"
          >
            Back to Admin Dashboard
          </button>

        </div>

      </div>
    )
  }


  if (!drive) {
    return null
  }


  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-4xl">

          <button
            onClick={() =>
              navigate('/admin')
            }
            className="text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            ← Back to Admin Dashboard
          </button>


          <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">

            <div>

              <h1 className="text-3xl font-bold text-slate-900">
                {drive.company_name}
              </h1>


              <p className="mt-1 text-lg text-slate-600">
                {drive.role}
              </p>

            </div>


            <span className="w-fit rounded-full bg-green-100 px-3 py-1 text-xs font-semibold text-green-700">
              {drive.status}
            </span>

          </div>

        </div>

      </header>


      <main className="mx-auto max-w-4xl space-y-6 px-5 py-8">

        {error && (

          <div className="rounded-xl border border-red-200 bg-red-50 p-4">

            <p className="font-semibold text-red-700">
              Action failed
            </p>

            <p className="mt-1 whitespace-pre-wrap text-sm text-red-600">
              {error}
            </p>

          </div>

        )}


        {uploadSuccess && (

          <div className="rounded-xl border border-green-200 bg-green-50 p-4">

            <p className="font-semibold text-green-700">
              Upload successful
            </p>

            <p className="mt-1 text-sm text-green-600">
              {uploadSuccess}
            </p>

          </div>

        )}


        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Company Details
          </h2>


          <div className="mt-5 grid gap-5 sm:grid-cols-2">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Company
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.company_name}
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Role
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.role}
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                CTC
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.ctc || 'Not specified'}
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Location
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.location || 'Not specified'}
              </p>
            </div>

          </div>

        </section>


        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Eligibility Criteria
          </h2>


          <div className="mt-5 grid gap-5 sm:grid-cols-2">

            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Minimum CGPA
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.min_cgpa}
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Minimum 10th Percentage
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.min_tenth}%
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Minimum 12th Percentage
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.min_twelfth}%
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Maximum Active Backlogs
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.max_backlogs}
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Eligible Branches
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.branches || 'Any'}
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Gender
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.gender || 'Any'}
              </p>
            </div>


            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Graduation Year
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.graduation_year || 'Any'}
              </p>
            </div>

          </div>

        </section>


        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Recruitment Schedule
          </h2>


          <div className="mt-5 space-y-4">

            <div>

              <p className="text-sm font-medium text-slate-600">
                Resume Shortlisting
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {drive.resume_shortlisting
                  ? 'Required'
                  : 'Not Required'}
              </p>

            </div>


            <div>

              <p className="text-sm font-medium text-slate-600">
                Registration Deadline
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.deadline
                )}
              </p>

            </div>


            <div>

              <p className="text-sm font-medium text-slate-600">
                Pre-Placement Talk
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.ppt
                )}
              </p>

            </div>


            <div>

              <p className="text-sm font-medium text-slate-600">
                Online Test
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.online_test
                )}
              </p>

            </div>


            <div>

              <p className="text-sm font-medium text-slate-600">
                Interview
              </p>

              <p className="mt-1 font-semibold text-slate-900">
                {formatDate(
                  drive.interview
                )}
              </p>

            </div>

          </div>

        </section>


        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Registration & Documents
          </h2>


          <div className="mt-5 space-y-5">

            <div>

              <p className="text-sm font-medium text-slate-600">
                Registration Link
              </p>


              {drive.registration_link ? (

                <a
                  href={
                    drive.registration_link
                  }
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 block break-all text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  {drive.registration_link}
                </a>

              ) : (

                <p className="mt-1 text-sm text-slate-500">
                  Not provided
                </p>

              )}

            </div>


            <div>

              <p className="text-sm font-medium text-slate-600">
                Job Description
              </p>


              {drive.jd ? (

                <div className="mt-2 flex flex-col gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 sm:flex-row sm:items-center sm:justify-between">

                  <div className="min-w-0">

                    <p className="text-xs text-slate-500">
                      PDF File
                    </p>

                    <p className="mt-1 break-all text-sm font-semibold text-slate-900">
                      {drive.jd_filename ||
                        'Job Description PDF'}
                    </p>

                  </div>


                  <button
                    type="button"
                    onClick={
                      handleViewJd
                    }
                    className="shrink-0 rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700"
                  >
                    View PDF
                  </button>

                </div>

              ) : (

                <div className="mt-2 rounded-xl bg-slate-50 p-4">

                  <p className="text-sm text-slate-500">
                    No JD uploaded.
                  </p>

                </div>

              )}

            </div>

          </div>

        </section>


        <section className="rounded-2xl border border-blue-100 bg-white p-6 shadow-sm">

          <div>

            <p className="text-sm font-medium text-blue-600">
              Recruitment Management
            </p>

            <h2 className="mt-1 text-lg font-bold text-slate-900">
              Upload Round Results
            </h2>

            <p className="mt-1 text-sm text-slate-500">
              Upload an Excel sheet containing the roll numbers of students who passed the selected recruitment round.
            </p>

            <p className="mt-2 text-xs text-slate-500">
              Students whose roll numbers are present in the Excel file will advance to the next stage. Students whose roll numbers are not present will be rejected.
            </p>

          </div>


          <div className="mt-5 space-y-5">

            <div>

              <label
                htmlFor="round-name"
                className="block text-sm font-medium text-slate-700"
              >
                Recruitment Round
              </label>


              <select
                id="round-name"
                value={roundName}
                onChange={(
                  event
                ) => {

                  setRoundName(
                    event.target.value
                  )

                  setUploadSuccess('')
                  setError('')
                  setRoundFile(null)


                  const fileInput =
                    document.getElementById(
                      'round-results-file'
                    )


                  if (fileInput) {
                    fileInput.value =
                      ''
                  }

                }}
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                {drive.resume_shortlisting && (

                  <option value="Resume Shortlisting">
                    Resume Shortlisting
                  </option>

                )}


                <option value="PPT">
                  PPT
                </option>


                <option value="Online Test">
                  Online Test
                </option>


                <option value="Interview">
                  Interview
                </option>


                <option value="Result">
                  Result
                </option>

              </select>

            </div>


            <div>

              <label
                htmlFor="round-results-file"
                className="block text-sm font-medium text-slate-700"
              >
                Excel File
              </label>


              <div className="mt-2 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 p-5">

                <input
                  id="round-results-file"
                  type="file"
                  accept=".xlsx,.xlsm"
                  onChange={
                    handleRoundFileChange
                  }
                  className="block w-full text-sm text-slate-600 file:mr-4 file:rounded-lg file:border-0 file:bg-blue-600 file:px-4 file:py-2.5 file:text-sm file:font-semibold file:text-white hover:file:bg-blue-700"
                />


                <p className="mt-2 text-xs text-slate-500">
                  Accepted files: .xlsx and .xlsm
                </p>


                {roundFile && (

                  <p className="mt-3 text-sm font-medium text-slate-700">
                    Selected:
                    {' '}
                    {roundFile.name}
                  </p>

                )}

              </div>

            </div>


            <button
              type="button"
              onClick={
                handleUploadResults
              }
              disabled={
                uploadingResults ||
                !roundFile
              }
              className="w-full rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
            >
              {uploadingResults
                ? 'Processing Results...'
                : 'Upload Round Results'}
            </button>

          </div>

        </section>


        <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">

          <button
            onClick={() =>
              navigate('/admin')
            }
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700 hover:bg-slate-50"
          >
            ← Back
          </button>


          <div className="flex flex-col gap-3 sm:flex-row">

            <button
              onClick={() =>
                navigate(
                  `/admin/edit-drive/${drive.id}`
                )
              }
              className="rounded-lg border border-blue-600 bg-white px-6 py-3 font-semibold text-blue-600 hover:bg-blue-50"
            >
              Edit Drive
            </button>


            {drive.status ===
              'Published' && (

              <button
                onClick={
                  handleWithdraw
                }
                disabled={
                  withdrawing
                }
                className="rounded-lg border border-red-300 bg-red-50 px-6 py-3 font-semibold text-red-700 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {withdrawing
                  ? 'Withdrawing...'
                  : 'Withdraw Drive'}
              </button>

            )}


            <button
              onClick={() =>
                navigate(
                  '/admin/applications'
                )
              }
              className="rounded-lg bg-blue-600 px-6 py-3 font-semibold text-white hover:bg-blue-700"
            >
              View Applications
            </button>

          </div>

        </div>

      </main>

    </div>
  )
}


export default AdminDriveDetails