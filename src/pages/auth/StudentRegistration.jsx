import {
  useEffect,
  useState,
} from 'react'

import {
  completeStudentRegistration,
  requestStudentRegistration,
  resendStudentRegistration,
  verifyStudentRegistration,
} from '../../services/api'


const initialDetails = {
  name: '',
  roll_no: '',
  mobile: '',
  branch: '',
  graduation_year: '',
  cgpa: '',
  tenth_percentage: '',
  twelfth_percentage: '',
  active_backlogs: '0',
  history_of_backlogs: false,
  gender: '',
  specially_abled: false,
  password: '',
  confirm_password: '',
}


function StudentRegistration({
  onCancel,
  onComplete,
}) {
  const [step, setStep] =
    useState('email')
  const [email, setEmail] =
    useState('')
  const [challengeId, setChallengeId] =
    useState('')
  const [otp, setOtp] =
    useState('')
  const [
    registrationToken,
    setRegistrationToken,
  ] = useState('')
  const [details, setDetails] =
    useState(initialDetails)
  const [error, setError] =
    useState('')
  const [message, setMessage] =
    useState('')
  const [loading, setLoading] =
    useState(false)
  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0)
  const [
    showPassword,
    setShowPassword,
  ] = useState(false)

  useEffect(() => {
    if (resendSeconds <= 0) {
      return undefined
    }
    const timer = window.setTimeout(
      () => setResendSeconds(
        current => Math.max(
          0,
          current - 1
        )
      ),
      1000
    )
    return () =>
      window.clearTimeout(timer)
  }, [resendSeconds])

  const updateDetail =
    (field, value) => {
      setDetails(current => ({
        ...current,
        [field]: value,
      }))
    }

  const requestOtp =
    async (event) => {
      event.preventDefault()
      setError('')
      setMessage('')
      const normalized =
        email.trim().toLowerCase()
      if (
        !/^[^\s@]+@nitrkl\.ac\.in$/.test(
          normalized
        )
      ) {
        setError(
          'Use your NITR college email address.'
        )
        return
      }
      setLoading(true)
      try {
        const response =
          await requestStudentRegistration(
            normalized
          )
        setEmail(normalized)
        setChallengeId(
          response.challenge_id
        )
        setResendSeconds(
          response.retry_after_seconds || 60
        )
        setMessage(response.message)
        setStep('otp')
      } catch (requestError) {
        setError(
          requestError?.message ||
          'Unable to start registration.'
        )
      } finally {
        setLoading(false)
      }
    }

  const verifyOtp =
    async (event) => {
      event.preventDefault()
      setError('')
      setMessage('')
      if (!/^[0-9]{6}$/.test(otp)) {
        setError('Enter the 6-digit code.')
        return
      }
      setLoading(true)
      try {
        const response =
          await verifyStudentRegistration(
            challengeId,
            otp
          )
        setRegistrationToken(
          response.registration_token
        )
        setOtp('')
        setStep('details')
      } catch (verifyError) {
        setError(
          verifyError?.message ||
          'Invalid or expired code.'
        )
      } finally {
        setLoading(false)
      }
    }

  const resendOtp = async () => {
    setError('')
    setMessage('')
    setLoading(true)
    try {
      const response =
        await resendStudentRegistration(
          challengeId
        )
      setOtp('')
      setResendSeconds(
        response.retry_after_seconds || 60
      )
      setMessage(response.message)
    } catch (resendError) {
      if (resendError?.retryAfter) {
        setResendSeconds(
          resendError.retryAfter
        )
      }
      setError(
        resendError?.message ||
        'Unable to resend the code.'
      )
    } finally {
      setLoading(false)
    }
  }

  const completeRegistration =
    async (event) => {
      event.preventDefault()
      setError('')
      setMessage('')
      if (
        details.password !==
        details.confirm_password
      ) {
        setError('Passwords do not match.')
        return
      }
      if (details.password.length < 12) {
        setError(
          'Password must be at least 12 characters.'
        )
        return
      }
      setLoading(true)
      const {
        confirm_password: _confirmation,
        ...requestDetails
      } = details
      const numericFields = [
        'graduation_year',
        'cgpa',
        'tenth_percentage',
        'twelfth_percentage',
        'active_backlogs',
      ]
      numericFields.forEach(field => {
        requestDetails[field] =
          Number(requestDetails[field])
      })
      requestDetails.mobile =
        requestDetails.mobile.trim() || null
      try {
        await completeStudentRegistration(
          registrationToken,
          requestDetails
        )
        setRegistrationToken('')
        setDetails(initialDetails)
        setStep('success')
      } catch (completeError) {
        setError(
          completeError?.message ||
          'Unable to create the account.'
        )
      } finally {
        setLoading(false)
      }
    }

  const inputClass =
    'mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500'

  return (
    <section className="mt-6 border-t border-gray-200 pt-6">
      <h2 className="text-lg font-semibold text-gray-900">
        Create student account
      </h2>
      <p className="mt-1 text-sm text-gray-500">
        {step === 'email' &&
          'Verify your institutional NITR email first.'}
        {step === 'otp' &&
          'Enter the 6-digit verification code.'}
        {step === 'details' &&
          'Complete your student profile with accurate details.'}
        {step === 'success' &&
          'Your account is ready.'}
      </p>

      {step === 'email' && (
        <form onSubmit={requestOtp}>
          <label className="mt-4 block text-sm font-medium text-gray-700">
            College email
          </label>
          <input
            type="email"
            value={email}
            onChange={event =>
              setEmail(event.target.value)
            }
            autoComplete="email"
            placeholder="student@nitrkl.ac.in"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg border border-blue-600 py-3 font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : 'Send verification code'}
          </button>
        </form>
      )}

      {step === 'otp' && (
        <form onSubmit={verifyOtp}>
          <label className="mt-4 block text-sm font-medium text-gray-700">
            Verification code
          </label>
          <input
            type="text"
            value={otp}
            onChange={event =>
              setOtp(
                event.target.value
                  .replace(/\D/g, '')
                  .slice(0, 6)
              )
            }
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            className={inputClass}
          />
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg border border-blue-600 py-3 font-medium text-blue-600 transition hover:bg-blue-50 disabled:opacity-50"
          >
            {loading
              ? 'Please wait...'
              : 'Verify code'}
          </button>
          <button
            type="button"
            disabled={
              loading ||
              resendSeconds > 0
            }
            onClick={resendOtp}
            className="mt-3 w-full text-sm font-medium text-blue-600 disabled:text-gray-400"
          >
            {resendSeconds > 0
              ? `Resend in ${resendSeconds}s`
              : 'Resend code'}
          </button>
        </form>
      )}

      {step === 'details' && (
        <form onSubmit={completeRegistration}>
          {[
            ['name', 'Full name', 'text'],
            ['roll_no', 'Roll number', 'text'],
            ['mobile', 'Indian mobile (optional)', 'tel'],
            ['branch', 'Branch', 'text'],
            ['graduation_year', 'Graduation year', 'number'],
            ['cgpa', 'CGPA', 'number'],
            ['tenth_percentage', '10th percentage', 'number'],
            ['twelfth_percentage', '12th percentage', 'number'],
            ['active_backlogs', 'Active backlogs', 'number'],
            ['gender', 'Gender', 'text'],
          ].map(([field, label, type]) => (
            <label
              key={field}
              className="mt-4 block text-sm font-medium text-gray-700"
            >
              {label}
              <input
                type={type}
                value={details[field]}
                onChange={event =>
                  updateDetail(
                    field,
                    event.target.value
                  )
                }
                required={field !== 'mobile'}
                step={
                  [
                    'cgpa',
                    'tenth_percentage',
                    'twelfth_percentage',
                  ].includes(field)
                    ? '0.01'
                    : undefined
                }
                className={inputClass}
              />
            </label>
          ))}

          <label className="mt-4 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={
                details.history_of_backlogs
              }
              onChange={event =>
                updateDetail(
                  'history_of_backlogs',
                  event.target.checked
                )
              }
            />
            I have a history of backlogs
          </label>

          <label className="mt-3 flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={
                details.specially_abled
              }
              onChange={event =>
                updateDetail(
                  'specially_abled',
                  event.target.checked
                )
              }
            />
            Person with disability
          </label>

          <label className="mt-4 block text-sm font-medium text-gray-700">
            Password
            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={details.password}
              onChange={event =>
                updateDetail(
                  'password',
                  event.target.value
                )
              }
              minLength={12}
              autoComplete="new-password"
              required
              className={inputClass}
            />
          </label>
          <label className="mt-4 block text-sm font-medium text-gray-700">
            Confirm password
            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={
                details.confirm_password
              }
              onChange={event =>
                updateDetail(
                  'confirm_password',
                  event.target.value
                )
              }
              minLength={12}
              autoComplete="new-password"
              required
              className={inputClass}
            />
          </label>
          <button
            type="button"
            onClick={() =>
              setShowPassword(
                current => !current
              )
            }
            aria-pressed={showPassword}
            className="mt-2 text-sm font-medium text-blue-600"
          >
            {showPassword
              ? 'Hide passwords'
              : 'Show passwords'}
          </button>
          <button
            type="submit"
            disabled={loading}
            className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            {loading
              ? 'Creating account...'
              : 'Create account'}
          </button>
        </form>
      )}

      {error && (
        <div
          role="alert"
          className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
        >
          {error}
        </div>
      )}
      {message && (
        <div
          role="status"
          className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          {message}
        </div>
      )}

      {step === 'success' ? (
        <button
          type="button"
          onClick={onComplete}
          className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white"
        >
          Return to login
        </button>
      ) : (
        <button
          type="button"
          onClick={onCancel}
          className="mt-4 w-full text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          Cancel registration
        </button>
      )}
    </section>
  )
}


export default StudentRegistration
