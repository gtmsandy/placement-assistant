import {
  createContext,
  useContext,
  useEffect,
  useState,
} from 'react'

const ReminderContext = createContext()

const defaultSettings = {
  enabled: true,
  reminderMinutes: 60,
}

function getStoredSettings() {
  try {
    const storedSettings =
      localStorage.getItem('placement_reminder_settings')

    return storedSettings
      ? JSON.parse(storedSettings)
      : defaultSettings
  } catch (error) {
    console.error(
      'Failed to load reminder settings:',
      error
    )

    return defaultSettings
  }
}

export function ReminderProvider({ children }) {
  const [settings, setSettings] = useState(
    getStoredSettings
  )

  useEffect(() => {
    localStorage.setItem(
      'placement_reminder_settings',
      JSON.stringify(settings)
    )
  }, [settings])

  const updateReminderSettings = (newSettings) => {
    setSettings((previous) => ({
      ...previous,
      ...newSettings,
    }))
  }

  return (
    <ReminderContext.Provider
      value={{
        settings,
        updateReminderSettings,
      }}
    >
      {children}
    </ReminderContext.Provider>
  )
}

export function useReminders() {
  return useContext(ReminderContext)
}