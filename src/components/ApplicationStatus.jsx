function ApplicationStatus({ status }) {
  const steps = [
    'Applied',
    'PPT',
    'Online Test',
    'Interview',
    'Result',
  ]

  const statusIndex =
    status === 'Selected' || status === 'Rejected'
      ? 4
      : steps.indexOf(status)

  return (
    <div className="mt-5">

      <div className="flex items-center">

        {steps.map((step, index) => {
          const completed = index <= statusIndex

          return (
            <div
              key={step}
              className="flex flex-1 items-center"
            >

              <div className="flex flex-col items-center">

                <div
                  className={`flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold ${
                    completed
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-200 text-slate-500'
                  }`}
                >
                  {completed ? '✓' : index + 1}
                </div>

                <p className="mt-2 text-center text-[10px] text-slate-500 sm:text-xs">
                  {step}
                </p>

              </div>

              {index < steps.length - 1 && (
                <div
                  className={`mx-2 h-1 flex-1 rounded ${
                    index < statusIndex
                      ? 'bg-blue-600'
                      : 'bg-slate-200'
                  }`}
                />
              )}

            </div>
          )
        })}

      </div>

      {(status === 'Selected' ||
        status === 'Rejected') && (
        <div
          className={`mt-5 rounded-xl p-4 ${
            status === 'Selected'
              ? 'bg-green-50'
              : 'bg-red-50'
          }`}
        >

          <p
            className={`font-semibold ${
              status === 'Selected'
                ? 'text-green-700'
                : 'text-red-700'
            }`}
          >
            {status === 'Selected'
              ? '🎉 Congratulations! You have been selected.'
              : 'Application rejected'}
          </p>

        </div>
      )}

    </div>
  )
}

export default ApplicationStatus