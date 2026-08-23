import {
  useState,
} from 'react'

import {
  useNavigate,
} from 'react-router-dom'

import {
  loginUser,
} from '../../services/api'


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


  const handleLogin =
    async (event) => {

      event.preventDefault()

      setError('')
      setLoading(true)

      try {

        if (
          !identifier.trim()
        ) {

          throw new Error(
            'Please enter your username or email'
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
            Username or Email
          </label>

          <input
            type="text"
            value={identifier}
            onChange={(event) =>
              setIdentifier(
                event.target.value
              )
            }
            placeholder="Username or email"
            autoComplete="username"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />


          <label className="mt-4 block text-sm font-medium text-gray-700">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(event) =>
              setPassword(
                event.target.value
              )
            }
            placeholder="Password"
            autoComplete="current-password"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />


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
            <div className="mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-600">
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

      </div>

    </div>
  )
}


export default Login