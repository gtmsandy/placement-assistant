import {
  useEffect,
  useState,
} from 'react'

import {
  Navigate,
  useLocation,
} from 'react-router-dom'

import {
  clearAuth,
  getAuthToken,
  getMe,
} from '../services/api'


function ProtectedRoute({
  children,
  allowedRoles,
}) {

  const location =
    useLocation()

  const [
    checking,
    setChecking,
  ] = useState(true)

  const [
    user,
    setUser,
  ] = useState(null)


  useEffect(() => {

    let mounted = true


    async function verifyAuthentication() {

      const token =
        getAuthToken()


      if (!token) {

        if (mounted) {
          setChecking(false)
        }

        return
      }


      try {

        const currentUser =
          await getMe()


        if (!mounted) {
          return
        }


        setUser(
          currentUser
        )

      } catch (error) {

        console.error(
          'Authentication verification failed:',
          error
        )

        clearAuth()

        if (mounted) {
          setUser(null)
        }

      } finally {

        if (mounted) {
          setChecking(false)
        }

      }

    }


    verifyAuthentication()


    return () => {
      mounted = false
    }

  }, [])


  if (checking) {

    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">

        <div className="text-center">

          <div className="text-lg font-medium text-gray-700">
            Verifying authentication...
          </div>

        </div>

      </div>
    )

  }


  if (!user) {

    return (
      <Navigate
        to="/login"
        replace
        state={{
          from: location.pathname,
        }}
      />
    )

  }


  if (
    allowedRoles &&
    !allowedRoles.includes(
      user.role
    )
  ) {

    if (
      user.role === 'admin'
    ) {

      return (
        <Navigate
          to="/admin"
          replace
        />
      )

    }


    return (
      <Navigate
        to="/student"
        replace
      />
    )

  }


  return children
}


export default ProtectedRoute