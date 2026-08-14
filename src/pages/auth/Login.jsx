import { useNavigate } from 'react-router-dom'

function Login() {
  const navigate = useNavigate()

  const handleLogin = () => {
    navigate('/student')
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

        <button
          onClick={handleLogin}
          className="mt-8 w-full rounded-lg bg-blue-600 py-3 font-medium text-white hover:bg-blue-700"
        >
          Login
        </button>

      </div>
    </div>
  )
}

export default Login