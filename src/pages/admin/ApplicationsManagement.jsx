import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useApplications } from '../../context/ApplicationContext'

function ApplicationsManagement() {
  const navigate = useNavigate()

  const {
    applications,
    updateApplicationStatus,
  } = useApplications()

  const [search, setSearch] = useState('')
  const [companyFilter, setCompanyFilter] = useState('ALL')
  const [statusFilter, setStatusFilter] = useState('ALL')

  const companies = useMemo(() => {
    const uniqueCompanies = [
      ...new Set(
        applications
          .map((application) => application.companyName)
          .filter(Boolean)
      ),
    ]

    return uniqueCompanies
  }, [applications])

  const filteredApplications = useMemo(() => {
    const searchText = search.trim().toLowerCase()

    return applications.filter((application) => {
      const studentName = String(
        application.studentName || ''
      ).toLowerCase()

      const rollNumber = String(
        application.rollNumber || ''
      ).toLowerCase()

      const collegeEmail = String(
        application.collegeEmail || ''
      ).toLowerCase()

      const companyName = String(
        application.companyName || ''
      ).toLowerCase()

      const branch = String(
        application.branch || ''
      ).toLowerCase()

      const applicationStatus = String(
        application.status || ''
      ).trim()

      const matchesSearch =
        searchText === '' ||
        studentName.includes(searchText) ||
        rollNumber.includes(searchText) ||
        collegeEmail.includes(searchText) ||
        companyName.includes(searchText) ||
        branch.includes(searchText)

      const matchesCompany =
        companyFilter === 'ALL' ||
        application.companyName === companyFilter

      const matchesStatus =
        statusFilter === 'ALL' ||
        applicationStatus === statusFilter

      return (
        matchesSearch &&
        matchesCompany &&
        matchesStatus
      )
    })
  }, [
    applications,
    search,
    companyFilter,
    statusFilter,
  ])

  const clearFilters = () => {
    setSearch('')
    setCompanyFilter('ALL')
    setStatusFilter('ALL')
  }

  const selectedCount = applications.filter(
    (application) =>
      String(application.status || '').trim() === 'Selected'
  ).length

  return (
    <div className="min-h-screen bg-slate-50">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-6xl">

          <button
            onClick={() => navigate('/admin')}
            className="text-sm font-medium text-blue-600"
          >
            ← Back to Dashboard
          </button>

          <p className="mt-4 text-sm text-slate-500">
            Placement Cell
          </p>

          <h1 className="text-2xl font-bold text-slate-900">
            Application Management
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Manage student applications and recruitment status.
          </p>

        </div>

      </header>

      <main className="mx-auto max-w-6xl space-y-6 px-5 py-8">

        {/* Summary */}

        <section className="grid gap-4 sm:grid-cols-3">

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Total Applications
            </p>

            <p className="mt-2 text-3xl font-bold text-slate-900">
              {applications.length}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Selected
            </p>

            <p className="mt-2 text-3xl font-bold text-green-600">
              {selectedCount}
            </p>

          </div>

          <div className="rounded-2xl bg-white p-5 shadow-sm">

            <p className="text-sm text-slate-500">
              Showing
            </p>

            <p className="mt-2 text-3xl font-bold text-blue-600">
              {filteredApplications.length}
            </p>

          </div>

        </section>

        {/* Filters */}

        <section className="rounded-2xl bg-white p-5 shadow-sm">

          <div className="grid gap-4 md:grid-cols-3">

            {/* Search */}

            <div>

              <label className="text-xs font-semibold text-slate-500">
                Search
              </label>

              <input
                type="text"
                value={search}
                onChange={(event) =>
                  setSearch(event.target.value)
                }
                placeholder="Name, roll no, email, company..."
                className="mt-2 w-full rounded-lg border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              />

            </div>

            {/* Company */}

            <div>

              <label className="text-xs font-semibold text-slate-500">
                Company
              </label>

              <select
                value={companyFilter}
                onChange={(event) =>
                  setCompanyFilter(event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="ALL">
                  All
                </option>

                {companies.map((company) => (
                  <option
                    key={company}
                    value={company}
                  >
                    {company}
                  </option>
                ))}

              </select>

            </div>

            {/* Status */}

            <div>

              <label className="text-xs font-semibold text-slate-500">
                Status
              </label>

              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(event.target.value)
                }
                className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
              >

                <option value="ALL">
                  All Statuses
                </option>

                <option value="Applied">
                  Applied
                </option>

                <option value="PPT">
                  PPT
                </option>

                <option value="Online Test">
                  Online Test
                </option>

                <option value="Interview">
                  Interview
                </option>

                <option value="Selected">
                  Selected
                </option>

                <option value="Rejected">
                  Rejected
                </option>

              </select>

            </div>

          </div>

          <button
            onClick={clearFilters}
            className="mt-4 text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            Clear Filters
          </button>

        </section>

        {/* Applications */}

        {applications.length === 0 ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              No applications yet
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Student applications will appear here after students apply.
            </p>

          </div>

        ) : filteredApplications.length === 0 ? (

          <div className="rounded-2xl bg-white p-10 text-center shadow-sm">

            <p className="text-lg font-semibold text-slate-900">
              No matching applications
            </p>

            <p className="mt-2 text-sm text-slate-500">
              Try changing your search or filters.
            </p>

            <button
              onClick={clearFilters}
              className="mt-5 rounded-lg bg-blue-600 px-5 py-3 text-sm font-semibold text-white hover:bg-blue-700"
            >
              Reset Filters
            </button>

          </div>

        ) : (

          <div className="space-y-4">

            {filteredApplications.map((application) => (

              <div
                key={application.id}
                className="rounded-2xl bg-white p-6 shadow-sm"
              >

                <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">

                  {/* Student Information */}

                  <div className="min-w-0">

                    <div className="flex flex-wrap items-center gap-3">

                      <h2 className="text-lg font-bold text-slate-900">
                        {application.studentName || 'Unknown Student'}
                      </h2>

                      <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                        Roll No: {application.rollNumber || 'N/A'}
                      </span>

                    </div>

                    <p className="mt-3 font-semibold text-slate-900">
                      {application.companyName || 'Unknown Company'}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {application.role || 'Role not specified'}
                    </p>

                    <div className="mt-4 grid gap-2 text-sm text-slate-600 sm:grid-cols-2">

                      <p>
                        <span className="font-medium text-slate-800">
                          Email:
                        </span>{' '}
                        {application.collegeEmail || 'N/A'}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Branch:
                        </span>{' '}
                        {application.branch || 'N/A'}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Graduation:
                        </span>{' '}
                        {application.graduationYear || 'N/A'}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          CTC:
                        </span>{' '}
                        {application.ctc || 'N/A'}
                      </p>

                      <p>
                        <span className="font-medium text-slate-800">
                          Location:
                        </span>{' '}
                        {application.location || 'N/A'}
                      </p>

                    </div>

                    <p className="mt-4 text-xs text-slate-400">
                      Applied on{' '}
                      {application.appliedAt
                        ? new Date(
                            application.appliedAt
                          ).toLocaleDateString('en-IN')
                        : 'Unknown date'}
                    </p>

                  </div>

                  {/* Status */}

                  <div className="w-full lg:w-64">

                    <label className="text-xs font-semibold text-slate-500">
                      Application Status
                    </label>

                    <select
                      value={application.status || 'Applied'}
                      onChange={(event) =>
                        updateApplicationStatus(
                          application.id,
                          event.target.value
                        )
                      }
                      className="mt-2 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    >

                      <option value="Applied">
                        Applied
                      </option>

                      <option value="PPT">
                        PPT
                      </option>

                      <option value="Online Test">
                        Online Test
                      </option>

                      <option value="Interview">
                        Interview
                      </option>

                      <option value="Selected">
                        Selected
                      </option>

                      <option value="Rejected">
                        Rejected
                      </option>

                    </select>

                    <div className="mt-3">

                      <span
                        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${
                          application.status === 'Selected'
                            ? 'bg-green-100 text-green-700'
                            : application.status === 'Rejected'
                              ? 'bg-red-100 text-red-700'
                              : application.status === 'Interview'
                                ? 'bg-purple-100 text-purple-700'
                                : 'bg-blue-100 text-blue-700'
                        }`}
                      >
                        {application.status || 'Applied'}
                      </span>

                    </div>

                  </div>

                </div>

              </div>

            ))}

          </div>

        )}

      </main>

    </div>
  )
}

export default ApplicationsManagement