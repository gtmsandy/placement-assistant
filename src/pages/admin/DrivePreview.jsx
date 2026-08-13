import { useLocation, useNavigate } from 'react-router-dom'
import { usePlacements } from '../../context/PlacementContext'

function DrivePreview() {
  const navigate = useNavigate()
  const location = useLocation()
  const { addDrive } = usePlacements()

  const drive = location.state?.drive

  if (!drive) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-xl rounded-2xl bg-white p-8 text-center shadow-sm">
          <h1 className="text-xl font-bold text-slate-900">
            No placement data found
          </h1>

          <button
            onClick={() => navigate('/admin/create-drive')}
            className="mt-5 rounded-lg bg-blue-600 px-5 py-3 font-medium text-white"
          >
            Create Placement Drive
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <button
          onClick={() => navigate('/admin/create-drive')}
          className="text-sm font-medium text-blue-600"
        >
          ← Edit Drive
        </button>
      </header>

      <main className="mx-auto max-w-3xl space-y-6 px-5 py-8">

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

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {drive.companyName}
              </h2>

              <p className="mt-1 text-slate-500">
                {drive.role}
              </p>
            </div>

            <span className="rounded-full bg-yellow-100 px-3 py-1 text-xs font-semibold text-yellow-700">
              Draft
            </span>
          </div>

          <div className="mt-6 grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                CTC
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {drive.ctc || 'Not specified'}
              </p>
            </div>

            <div className="rounded-xl bg-slate-50 p-4">
              <p className="text-xs text-slate-500">
                Location
              </p>

              <p className="mt-1 font-bold text-slate-900">
                {drive.location || 'Not specified'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Eligibility Criteria
          </h2>

          <div className="mt-5 space-y-3">
            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Minimum CGPA
              </span>

              <span className="font-semibold">
                {drive.minCgpa || 'Not specified'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Minimum 10th Percentage
              </span>

              <span className="font-semibold">
                {drive.minTenth
                  ? `${drive.minTenth}%`
                  : 'Not specified'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Minimum 12th Percentage
              </span>

              <span className="font-semibold">
                {drive.minTwelfth
                  ? `${drive.minTwelfth}%`
                  : 'Not specified'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Maximum Active Backlogs
              </span>

              <span className="font-semibold">
                {drive.maxBacklogs || '0'}
              </span>
            </div>

            <div className="flex justify-between gap-4">
              <span className="text-sm text-slate-600">
                Eligible Branches
              </span>

              <span className="max-w-[60%] text-right font-semibold">
                {drive.branches || 'Not specified'}
              </span>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Recruitment Schedule
          </h2>

          <div className="mt-5 space-y-4">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Registration Deadline
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.deadline || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Pre-Placement Talk
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.ppt || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Online Test / OT
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.ot || 'Not specified'}
              </p>
            </div>

            <div>
              <p className="text-sm font-semibold text-slate-900">
                Interview
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.interview || 'Not specified'}
              </p>
            </div>
          </div>
        </section>

        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold text-slate-900">
            Registration & Documents
          </h2>

          <div className="mt-4 space-y-4">
            <div>
              <p className="text-sm font-medium text-slate-600">
                Registration Link
              </p>

              <p className="mt-1 break-all text-sm text-blue-600">
                {drive.registrationLink || 'Not provided'}
              </p>
            </div>

            <div>
              <p className="text-sm font-medium text-slate-600">
                Job Description
              </p>

              <p className="mt-1 text-sm text-slate-500">
                {drive.jd?.name || 'No JD uploaded'}
              </p>
            </div>
          </div>
        </section>

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button
            onClick={() => navigate('/admin/create-drive')}
            className="rounded-lg border border-slate-300 bg-white px-6 py-3 font-medium text-slate-700"
          >
            Edit
          </button>

          <button
            onClick={() => {
            addDrive(drive)
            alert('Drive published successfully!')
            navigate('/admin')
        }
    }
            className="rounded-lg bg-green-600 px-6 py-3 font-semibold text-white hover:bg-green-700"
>

            Publish Drive
          </button>
        </div>

      </main>
    </div>
  )
}

export default DrivePreview