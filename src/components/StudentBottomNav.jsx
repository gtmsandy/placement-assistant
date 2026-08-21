import { useNavigate } from 'react-router-dom'

function StudentBottomNav({ active }) {
  const navigate = useNavigate()

  const items = [
    {
      id: 'home',
      label: 'Home',
      icon: '🏠',
      path: '/student',
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: '📅',
      path: '/student/calendar',
    },
    {
      id: 'applications',
      label: 'Applications',
      icon: '📋',
      path: '/student/applications',
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-slate-200 bg-white">
      <div className="mx-auto flex max-w-5xl justify-around py-2">

        {items.map((item) => {
          const isActive = active === item.id

          return (
            <button
              key={item.id}
              onClick={() => {
                if (item.id === 'home' && active === 'home') {
                  window.scrollTo({
                    top: 0,
                    behavior: 'smooth',
                  })
                } else {
                  navigate(item.path)
                }
              }}
              className={`flex min-w-[90px] flex-col items-center gap-1 text-xs font-medium transition ${
                isActive
                  ? 'text-blue-600'
                  : 'text-slate-500 hover:text-blue-600'
              }`}
            >
              <span className="text-lg leading-none">
                {item.icon}
              </span>

              <span>
                {item.label}
              </span>
            </button>
          )
        })}

      </div>
    </nav>
  )
}

export default StudentBottomNav