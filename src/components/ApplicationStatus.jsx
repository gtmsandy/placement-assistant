function ApplicationStatus({
  status,
  currentStage,
  resumeShortlisting = false,
}) {
  const normalizedStatus =
    String(status || 'Applied')
      .trim()
      .toLowerCase()

  const normalizedCurrentStage =
    String(
      currentStage ||
        (normalizedStatus === 'selected'
          ? 'Result'
          : 'Applied')
    ).trim()

  const steps = [
    {
      key: 'Applied',
      label: 'Applied',
    },

    ...(resumeShortlisting
      ? [
          {
            key: 'Resume Shortlisting',
            label: 'Resume Shortlisting',
          },
        ]
      : []),

    {
      key: 'PPT',
      label: 'PPT',
    },

    {
      key: 'Online Test',
      label: 'Online Test',
    },

    {
      key: 'Interview',
      label: 'Interview',
    },

    {
      key: 'Result',
      label: 'Result',
    },
  ]

  const currentIndex = steps.findIndex(
    (step) =>
      step.key === normalizedCurrentStage
  )

  const isSelected =
    normalizedStatus === 'selected'

  const isRejected =
    normalizedStatus === 'rejected'

  const getStepState = (index) => {
    /*
      SELECTED

      Once a student is selected,
      the entire recruitment process
      is considered completed.
    */
    if (isSelected) {
      return 'completed'
    }

    /*
      REJECTED

      Rejection happens at the actual
      current recruitment stage.

      Example:

      currentStage = PPT
      status = Rejected

      Therefore PPT becomes rejected.
    */
    if (isRejected) {
      if (
        currentIndex !== -1 &&
        index < currentIndex
      ) {
        return 'completed'
      }

      if (
        currentIndex !== -1 &&
        index === currentIndex
      ) {
        return 'rejected'
      }

      /*
        Fallback for old records where
        current_stage was not stored.
      */
      if (currentIndex === -1) {
        if (index === steps.length - 1) {
          return 'rejected'
        }

        if (index === 0) {
          return 'completed'
        }

        return 'pending'
      }

      return 'pending'
    }

    /*
      If the current stage is not found,
      safely keep Applied as current.
    */
    if (currentIndex === -1) {
      if (index === 0) {
        return 'current'
      }

      return 'pending'
    }

    /*
      Everything before the current stage
      has already been completed.
    */
    if (index < currentIndex) {
      return 'completed'
    }

    /*
      Current recruitment stage.
    */
    if (index === currentIndex) {
      return 'current'
    }

    /*
      Everything after the current stage
      is still pending.
    */
    return 'pending'
  }

  return (
    <div className="mt-5">

      <div className="flex items-start">

        {steps.map(
          (step, index) => {
            const state =
              getStepState(index)

            return (
              <div
                key={step.key}
                className="flex min-w-0 flex-1 items-start"
              >

                {/* Step */}

                <div className="flex min-w-0 flex-1 flex-col items-center">

                  {/* Circle */}

                  <div
                    className={`
                      flex h-9 w-9 items-center justify-center
                      rounded-full text-sm font-bold
                      ${
                        state === 'completed'
                          ? 'bg-green-100 text-green-700'
                          : state === 'current'
                            ? 'bg-blue-100 text-blue-700 ring-2 ring-blue-200'
                            : state === 'rejected'
                              ? 'bg-red-100 text-red-700'
                              : 'bg-slate-100 text-slate-400'
                      }
                    `}
                  >

                    {state ===
                      'completed' && (
                      '✓'
                    )}

                    {state ===
                      'current' && (
                      index + 1
                    )}

                    {state ===
                      'rejected' && (
                      '✕'
                    )}

                    {state ===
                      'pending' && (
                      index + 1
                    )}

                  </div>

                  {/* Step label */}

                  <p
                    className={`
                      mt-2 text-center text-xs font-semibold
                      ${
                        state === 'completed'
                          ? 'text-green-700'
                          : state === 'current'
                            ? 'text-blue-700'
                            : state === 'rejected'
                              ? 'text-red-700'
                              : 'text-slate-400'
                      }
                    `}
                  >
                    {step.label}
                  </p>

                  {/* Resume screening description */}

                  {step.key ===
                    'Resume Shortlisting' && (
                    <p className="mt-1 text-center text-[10px] font-medium text-slate-500">
                      Resume Screening
                    </p>
                  )}

                  {/* Current */}

                  {state === 'current' && (
                    <p className="mt-1 text-center text-[10px] font-medium text-blue-600">
                      Current
                    </p>
                  )}

                  {/* Rejected */}

                  {state === 'rejected' && (
                    <p className="mt-1 text-center text-[10px] font-medium text-red-600">
                      Rejected
                    </p>
                  )}

                </div>

                {/* Connector */}

                {index <
                  steps.length - 1 && (
                  <div
                    className={`
                      mt-4 h-0.5 flex-1
                      ${
                        state ===
                        'completed'
                          ? 'bg-green-300'
                          : 'bg-slate-200'
                      }
                    `}
                  />
                )}

              </div>
            )
          }
        )}

      </div>

      {/* Selected message */}

      {isSelected && (
        <div className="mt-5 rounded-xl border border-green-200 bg-green-50 p-4">

          <p className="text-sm font-semibold text-green-800">
            🎉 Congratulations! You have been selected.
          </p>

        </div>
      )}

      {/* Rejected message */}

      {isRejected && (
        <div className="mt-5 rounded-xl border border-red-200 bg-red-50 p-4">

          <p className="text-sm font-semibold text-red-800">
            Your application was not selected.
          </p>

          {normalizedCurrentStage &&
            normalizedCurrentStage !==
              'Result' && (
              <p className="mt-1 text-xs text-red-700">
                Recruitment stopped at:{' '}
                {normalizedCurrentStage}
              </p>
            )}

        </div>
      )}

    </div>
  )
}

export default ApplicationStatus