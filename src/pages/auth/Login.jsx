import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

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
    async () => {

      setError('')
      setLoading(true)

      try {

        const response =
          await loginUser(
            identifier,
            password,
            role
          )


        if (
          response.user.role ===
          'admin'
        ) {
          navigate('/admin')
        } else {
          navigate('/student')
        }

      } catch (error) {

        console.error(
          'Login failed:',
          error
        )

        setError(
          error.message ||
          'Unable to login'
        )

      } finally {

        setLoading(false)

      }
    }


  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">

      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-lg">

        <h1 className="text-3xl font-bold text-gray-900">
          Placement Assistant
        </h1>

        <p className="mt-2 text-gray-500">
          Manage your campus placement journey
        </p>


        <div className="mt-8">

          <label className="block text-sm font-medium text-gray-700">
            Username or Email
          </label>

          <input
            type="text"
            value={identifier}
            onChange={(e) =>
              setIdentifier(
                e.target.value
              )
            }
            placeholder="Username or email"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          />


          <label className="mt-4 block text-sm font-medium text-gray-700">
            Password
          </label>

          <input
            type="password"
            value={password}
            onChange={(e) =>
              setPassword(
                e.target.value
              )
            }
            placeholder="Password"
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
          />


          <label className="mt-4 block text-sm font-medium text-gray-700">
            Role
          </label>

          <select
            value={role}
            onChange={(e) =>
              setRole(
                e.target.value
              )
            }
            className="mt-2 w-full rounded-lg border border-gray-300 px-4 py-3 outline-none focus:border-blue-500"
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
            onClick={handleLogin}
            disabled={loading}
            className="mt-6 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          >

            {loading
              ? 'Logging in...'
              : 'Login'}

          </button>

        </div>

      </div>

    </div>
  )
}


export default Login