import {
  useEffect,
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  loginUser,
  requestPasswordRecovery,
  resendPasswordRecovery,
  resetRecoveredPassword,
  verifyPasswordRecovery,
} from '../../services/api'


const indianMobilePattern =
  /^(?:\+91)?[6-9][0-9]{9}$/

const usernamePattern =
  /^[a-zA-Z0-9._-]+$/


function validateIdentifier(
  value,
  role
) {
  const normalized =
    value.trim()

  if (!normalized) {
    return 'Please enter your college email, mobile number, or username.'
  }

  if (normalized.includes('@')) {
    if (
      !/^[^\s@]+@[^\s@]+$/.test(
        normalized
      )
    ) {
      return 'Please enter a valid email address.'
    }

    if (
      role === 'student' &&
      !normalized
        .toLowerCase()
        .endsWith('@nitrkl.ac.in')
    ) {
      return 'Use your NITR college email address.'
    }

    return ''
  }

  if (/^[+0-9\s-]+$/.test(normalized)) {
    const compact =
      normalized.replace(
        /[\s-]/g,
        ''
      )

    if (
      !indianMobilePattern.test(
        compact
      )
    ) {
      return 'Enter a valid 10-digit Indian mobile number.'
    }

    return ''
  }

  if (
    !usernamePattern.test(
      normalized
    )
  ) {
    return 'Please enter a valid username.'
  }

  return ''
}


function validateRecoveryEmail(
  value
) {
  const normalized =
    value.trim().toLowerCase()

  if (!normalized) {
    return 'Please enter your NITR college email.'
  }

  if (
    !/^[^\s@]+@[^\s@]+$/.test(
      normalized
    ) ||
    !normalized.endsWith(
      '@nitrkl.ac.in'
    )
  ) {
    return 'Use your NITR college email address.'
  }

  return ''
}


function Login() {

  const navigate =
    useNavigate()


  const [
    identifier,
    setIdentifier,
  ] = useState('')


  const [
    password,
    setPassword,
  ] = useState('')


  const [
    role,
    setRole,
  ] = useState('student')


  const [
    error,
    setError,
  ] = useState('')


  const [
    loading,
    setLoading,
  ] = useState(false)


  const [
    showPassword,
    setShowPassword,
  ] = useState(false)


  const [
    showRecovery,
    setShowRecovery,
  ] = useState(false)


  const [
    recoveryIdentifier,
    setRecoveryIdentifier,
  ] = useState('')


  const [
    recoveryMessage,
    setRecoveryMessage,
  ] = useState('')


  const [
    recoveryError,
    setRecoveryError,
  ] = useState('')


  const [
    recoveryLoading,
    setRecoveryLoading,
  ] = useState(false)


  const [
    recoveryStep,
    setRecoveryStep,
  ] = useState('identifier')


  const [
    challengeId,
    setChallengeId,
  ] = useState('')


  const [
    otp,
    setOtp,
  ] = useState('')


  const [
    resetToken,
    setResetToken,
  ] = useState('')


  const [
    newPassword,
    setNewPassword,
  ] = useState('')


  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState('')


  const [
    resendSeconds,
    setResendSeconds,
  ] = useState(0)


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


  const clearRecovery = () => {
    setRecoveryStep('identifier')
    setChallengeId('')
    setOtp('')
    setResetToken('')
    setNewPassword('')
    setConfirmPassword('')
    setRecoveryError('')
    setRecoveryMessage('')
    setResendSeconds(0)
  }


  const handleLogin =
    async (event) => {

      event.preventDefault()

      setError('')
      setLoading(true)

      try {

        const identifierError =
          validateIdentifier(
            identifier,
            role
          )

        if (identifierError) {
          throw new Error(
            identifierError
          )
        }


        if (!password) {

          throw new Error(
            'Please enter your password'
          )
        }


        const response =
          await loginUser(
            identifier.trim(),
            password,
            role
          )


        if (
          !response ||
          !response.user
        ) {

          throw new Error(
            'Invalid response received from server'
          )
        }


        if (
          response.user.role ===
          'admin'
        ) {

          navigate(
            '/admin',
            {
              replace: true,
            }
          )

        } else {

          navigate(
            '/student',
            {
              replace: true,
            }
          )

        }

      } catch (error) {

        console.error(
          'Login failed:',
          error
        )

        setError(
          error?.message ||
          'Unable to login. Please check your credentials.'
        )

      } finally {

        setLoading(false)

      }

    }


  const handleRecoveryRequest =
    async (event) => {
      event.preventDefault()

      setRecoveryError('')
      setRecoveryMessage('')

      const identifierError =
        validateRecoveryEmail(
          recoveryIdentifier
        )

      if (identifierError) {
        setRecoveryError(
          identifierError
        )
        return
      }

      setRecoveryLoading(true)

      try {
        const response =
          await requestPasswordRecovery(
            recoveryIdentifier
          )

        setChallengeId(
          response.challenge_id
        )
        setResendSeconds(
          response.retry_after_seconds || 60
        )
        setRecoveryStep('otp')
        setRecoveryMessage(
          response?.message ||
          'If an account matches that email address, recovery instructions have been sent.'
        )
      } catch (error) {
        console.error(
          'Password recovery request failed:',
          error
        )

        setRecoveryError(
          'Unable to request password recovery. Please try again.'
        )
      } finally {
        setRecoveryLoading(false)
      }
    }


  const handleRecoveryVerify =
    async (event) => {
      event.preventDefault()
      setRecoveryError('')
      setRecoveryMessage('')

      if (!/^[0-9]{6}$/.test(otp)) {
        setRecoveryError(
          'Enter the 6-digit code.'
        )
        return
      }

      setRecoveryLoading(true)
      try {
        const response =
          await verifyPasswordRecovery(
            challengeId,
            otp
          )
        setResetToken(
          response.reset_token
        )
        setOtp('')
        setRecoveryStep('password')
      } catch (error) {
        setRecoveryError(
          error?.message ||
          'Invalid or expired code.'
        )
      } finally {
        setRecoveryLoading(false)
      }
    }


  const handleRecoveryResend =
    async () => {
      setRecoveryError('')
      setRecoveryMessage('')
      setRecoveryLoading(true)
      try {
        const response =
          await resendPasswordRecovery(
            challengeId
          )
        setOtp('')
        setResendSeconds(
          response.retry_after_seconds || 60
        )
        setRecoveryMessage(
          response.message
        )
      } catch (error) {
        if (error?.retryAfter) {
          setResendSeconds(
            error.retryAfter
          )
        }
        setRecoveryError(
          error?.message ||
          'Unable to resend the code.'
        )
      } finally {
        setRecoveryLoading(false)
      }
    }


  const handlePasswordReset =
    async (event) => {
      event.preventDefault()
      setRecoveryError('')
      setRecoveryMessage('')

      if (newPassword !== confirmPassword) {
        setRecoveryError(
          'Passwords do not match.'
        )
        return
      }

      setRecoveryLoading(true)
      try {
        await resetRecoveredPassword(
          resetToken,
          newPassword
        )
        setResetToken('')
        setNewPassword('')
        setConfirmPassword('')
        setRecoveryStep('success')
        setRecoveryMessage(
          'Password reset successfully. You can now log in.'
        )
      } catch (error) {
        setRecoveryError(
          error?.message ||
          'Unable to reset the password.'
        )
      } finally {
        setRecoveryLoading(false)
      }
    }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <div>

          <h1 className="text-3xl font-bold text-gray-900">
            Placement Assistant
          </h1>

          <p className="mt-2 text-gray-500">
            Manage your campus placement journey
          </p>

        </div>


        <form
          className="mt-8"
          onSubmit={handleLogin}
        >

          <label className="block text-sm font-medium text-gray-700">
            College email / mobile / username
          </label>

          <input
            type="text"
            value={identifier}
            onChange={(event) =>
              setIdentifier(
                event.target.value
              )
            }
            placeholder="College email, mobile, or username"
            autoComplete="username"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />


          <label className="mt-4 block text-sm font-medium text-gray-700">
            Password
          </label>

          <div className="relative mt-2">
            <input
              type={
                showPassword
                  ? 'text'
                  : 'password'
              }
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              placeholder="Password"
              autoComplete="current-password"
              className="w-full rounded-lg border border-gray-300 px-4 py-3 pr-20 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />

            <button
              type="button"
              onClick={() =>
                setShowPassword(
                  current => !current
                )
              }
              aria-label={
                showPassword
                  ? 'Hide password'
                  : 'Show password'
              }
              aria-pressed={showPassword}
              className="absolute inset-y-0 right-0 px-4 text-sm font-medium text-blue-600 hover:text-blue-700"
            >
              {showPassword
                ? 'Hide'
                : 'Show'}
            </button>
          </div>


          <button
            type="button"
            onClick={() => {
              if (showRecovery) {
                clearRecovery()
              }
              setShowRecovery(!showRecovery)
              setRecoveryIdentifier(
                identifier.trim()
              )
            }}
            className="mt-3 text-sm font-medium text-blue-600 hover:text-blue-700"
          >
            {showRecovery
              ? 'Cancel password recovery'
              : 'Forgot password?'}
          </button>


          <label className="mt-4 block text-sm font-medium text-gray-700">
            Role
          </label>

          <select
            value={role}
            onChange={(event) =>
              setRole(
                event.target.value
              )
            }
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          >

            <option value="student">
              Student
            </option>

            <option value="admin">
              Admin
            </option>

          </select>


          {error && (
            <div
              role="alert"
              className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
            >
              {error}
            </div>
          )}


          <button
            type="submit"
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading
              ? 'Logging in...'
              : 'Login'}

          </button>

        </form>


        {showRecovery && (
          <form
            className="mt-6 border-t border-gray-200 pt-6"
            onSubmit={
              recoveryStep === 'identifier'
                ? handleRecoveryRequest
                : recoveryStep === 'otp'
                  ? handleRecoveryVerify
                  : recoveryStep === 'password'
                    ? handlePasswordReset
                    : event => event.preventDefault()
            }
          >
            <h2 className="text-lg font-semibold text-gray-900">
              Reset student password
            </h2>

            <p className="mt-1 text-sm text-gray-500">
              {recoveryStep === 'identifier' &&
                'Enter your institutional NITR college email.'}
              {recoveryStep === 'otp' &&
                'Enter the 6-digit recovery code.'}
              {recoveryStep === 'password' &&
                'Choose a new password of at least 12 characters.'}
              {recoveryStep === 'success' &&
                'Your password has been updated.'}
            </p>

            {recoveryStep === 'identifier' && (
              <>
                <label className="mt-4 block text-sm font-medium text-gray-700">
                  NITR college email
                </label>
                <input
                  type="text"
                  value={recoveryIdentifier}
                  onChange={(event) =>
                    setRecoveryIdentifier(
                      event.target.value
                    )
                  }
                  autoComplete="username"
                  inputMode="email"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </>
            )}

            {recoveryStep === 'otp' && (
              <>
                <label className="mt-4 block text-sm font-medium text-gray-700">
                  Recovery code
                </label>
                <input
                  type="text"
                  value={otp}
                  onChange={(event) =>
                    setOtp(
                      event.target.value
                        .replace(/\D/g, '')
                        .slice(0, 6)
                    )
                  }
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={6}
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </>
            )}

            {recoveryStep === 'password' && (
              <>
                <label className="mt-4 block text-sm font-medium text-gray-700">
                  New password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) =>
                    setNewPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <label className="mt-4 block text-sm font-medium text-gray-700">
                  Confirm new password
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) =>
                    setConfirmPassword(
                      event.target.value
                    )
                  }
                  autoComplete="new-password"
                  className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </>
            )}

            {recoveryError && (
              <div
                role="alert"
                className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600"
              >
                {recoveryError}
              </div>
            )}

            {recoveryMessage && (
              <div
                role="status"
                className="mt-4 rounded-lg bg-green-50 px-4 py-3 text-sm text-green-700"
              >
                {recoveryMessage}
              </div>
            )}

            {recoveryStep !== 'success' && (
              <button
                type="submit"
                disabled={recoveryLoading}
                className="mt-4 w-full rounded-lg border border-blue-600 py-3 font-medium text-blue-600 transition hover:bg-blue-50 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {recoveryLoading
                  ? 'Please wait...'
                  : recoveryStep === 'identifier'
                    ? 'Send recovery code'
                    : recoveryStep === 'otp'
                      ? 'Verify code'
                      : 'Reset password'}
              </button>
            )}

            {recoveryStep === 'otp' && (
              <button
                type="button"
                disabled={
                  recoveryLoading ||
                  resendSeconds > 0
                }
                onClick={handleRecoveryResend}
                className="mt-3 w-full text-sm font-medium text-blue-600 disabled:text-gray-400"
              >
                {resendSeconds > 0
                  ? `Resend in ${resendSeconds}s`
                  : 'Resend code'}
              </button>
            )}

            {recoveryStep === 'success' && (
              <button
                type="button"
                onClick={() => {
                  clearRecovery()
                  setShowRecovery(false)
                }}
                className="mt-4 w-full rounded-lg bg-blue-600 py-3 font-medium text-white transition hover:bg-blue-700"
              >
                Return to login
              </button>
            )}
          </form>
        )}

      </div>

    </div>
  )
}


export default Login
