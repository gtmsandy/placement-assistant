import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useReminders } from '../../context/ReminderContext'
import { usePlacements } from '../../context/PlacementContext'
import {
  requestNotificationPermission,
  getNotificationPermission,
  showTestNotification,
} from '../../services/notificationService'

function ReminderSettings() {
  const navigate = useNavigate()

  const {
    settings,
    updateReminderSettings,
  } = useReminders()

  const { drives } = usePlacements()

  const [permission, setPermission] =
    useState(
      getNotificationPermission()
    )

  const [testMessage, setTestMessage] =
    useState('')

  const reminderOptions = [
    {
      value: 180,
      label: '3 hours before',
    },
    {
      value: 120,
      label: '2 hours before',
    },
    {
      value: 60,
      label: '1 hour before',
    },
    {
      value: 30,
      label: '30 minutes before',
    },
    {
      value: 15,
      label: '15 minutes before',
    },
  ]

  /*
    Count upcoming events across ALL published drives.

    Eligibility does not matter for reminders.
  */

  const upcomingEvents = useMemo(() => {
    const events = []

    drives
      .filter(
        (drive) =>
          drive.status === 'Published'
      )
      .forEach((drive) => {
        if (drive.deadline) {
          events.push({
            id: `${drive.id}-deadline`,
            company: drive.companyName,
            type: 'Registration Deadline',
            date: drive.deadline,
          })
        }

        if (drive.ppt) {
          events.push({
            id: `${drive.id}-ppt`,
            company: drive.companyName,
            type: 'Pre-Placement Talk',
            date: drive.ppt,
          })
        }

        if (drive.ot) {
          events.push({
            id: `${drive.id}-ot`,
            company: drive.companyName,
            type: 'Online Test',
            date: drive.ot,
          })
        }

        if (drive.interview) {
          events.push({
            id: `${drive.id}-interview`,
            company: drive.companyName,
            type: 'Interview',
            date: drive.interview,
          })
        }
      })

    return events
      .filter((event) => {
        const date = new Date(event.date)

        return (
          !Number.isNaN(date.getTime()) &&
          date.getTime() > Date.now()
        )
      })
      .sort(
        (a, b) =>
          new Date(a.date) -
          new Date(b.date)
      )
  }, [drives])

  /*
    Request browser notification permission.
  */

  const handleEnableNotifications =
    async () => {
      const result =
        await requestNotificationPermission()

      setPermission(result)

      if (result === 'granted') {
        setTestMessage(
          'Notifications enabled successfully.'
        )
      } else if (result === 'denied') {
        setTestMessage(
          'Notifications were blocked. Please allow notifications in your browser settings.'
        )
      } else if (result === 'unsupported') {
        setTestMessage(
          'This browser does not support notifications.'
        )
      }

      setTimeout(() => {
        setTestMessage('')
      }, 4000)
    }

  /*
    Test notification.
  */

  const handleTestNotification = () => {
    const success =
      showTestNotification()

    if (success) {
      setTestMessage(
        'Test notification sent successfully.'
      )
    } else {
      setTestMessage(
        'Please enable browser notifications first.'
      )
    }

    setTimeout(() => {
      setTestMessage('')
    }, 4000)
  }

  /*
    Save reminder preference.
  */

  const handleReminderChange = (
    value
  ) => {
    updateReminderSettings({
      reminderMinutes: Number(value),
    })
  }

  /*
    Schedule checker.

    This checks every 30 seconds whether
    any event has reached its reminder time.
  */

  useEffect(() => {
    if (!settings.enabled) {
      return undefined
    }

    if (
      !('Notification' in window) ||
      Notification.permission !== 'granted'
    ) {
      return undefined
    }

    const checkReminders = () => {
      const now = Date.now()

      upcomingEvents.forEach((event) => {
        const eventTime =
          new Date(event.date).getTime()

        const reminderTime =
          eventTime -
          settings.reminderMinutes *
            60 *
            1000

        /*
          Trigger when current time has reached
          the reminder time but before the event.
        */

        if (
          now >= reminderTime &&
          now < eventTime
        ) {
          const storageKey =
            `placement_reminder_${event.id}_${settings.reminderMinutes}`

          const alreadyShown =
            localStorage.getItem(
              storageKey
            )

          if (alreadyShown) {
            return
          }

          const minutes =
            settings.reminderMinutes

          const notification = new Notification(
            `Placement Reminder: ${event.company}`,
            {
              body: `${event.type} is scheduled in ${minutes} minutes.`,
              tag: storageKey,
            }
          )

          if (notification) {
            localStorage.setItem(
              storageKey,
              'shown'
            )
          }
        }
      })
    }

    checkReminders()

    const interval = setInterval(
      checkReminders,
      30000
    )

    return () => {
      clearInterval(interval)
    }
  }, [
    settings.enabled,
    settings.reminderMinutes,
    upcomingEvents,
  ])

  const formatDate = (date) => {
    const parsedDate = new Date(date)

    if (Number.isNaN(parsedDate.getTime())) {
      return date
    }

    return parsedDate.toLocaleString(
      'en-IN',
      {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      {/* Header */}

      <header className="border-b border-slate-200 bg-white px-5 py-5">

        <div className="mx-auto max-w-3xl">

          <button
            onClick={() =>
              navigate('/student/calendar')
            }
            className="text-sm font-medium text-blue-600"
          >
            ← Back to Calendar
          </button>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Reminder Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Choose when you want to be reminded
            about placement events.
          </p>

        </div>

      </header>

      <main className="mx-auto max-w-3xl space-y-5 px-5 py-8">

        {/* Main Settings */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Placement Reminders
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Receive reminders before PPTs,
            tests, interviews and registration
            deadlines.
          </p>

          {/* Enable / Disable */}

          <div className="mt-6 flex items-center justify-between rounded-xl bg-slate-50 p-4">

            <div>

              <p className="font-semibold text-slate-900">
                Enable reminders
              </p>

              <p className="mt-1 text-xs text-slate-500">
                Receive browser notifications
                for placement events.
              </p>

            </div>

            <button
              onClick={() =>
                updateReminderSettings({
                  enabled:
                    !settings.enabled,
                })
              }
              className={`relative h-7 w-12 rounded-full transition ${
                settings.enabled
                  ? 'bg-blue-600'
                  : 'bg-slate-300'
              }`}
              aria-label="Toggle reminders"
            >

              <span
                className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition ${
                  settings.enabled
                    ? 'left-6'
                    : 'left-1'
                }`}
              />

            </button>

          </div>

          {/* Reminder Time */}

          <div className="mt-6">

            <label className="text-sm font-semibold text-slate-900">
              Remind me before
            </label>

            <p className="mt-1 text-xs text-slate-500">
              This setting applies to all
              placement events.
            </p>

            <select
              value={
                settings.reminderMinutes
              }
              onChange={(event) =>
                handleReminderChange(
                  event.target.value
                )
              }
              disabled={!settings.enabled}
              className="mt-3 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:bg-slate-100"
            >

              {reminderOptions.map(
                (option) => (

                  <option
                    key={option.value}
                    value={option.value}
                  >
                    {option.label}
                  </option>

                )
              )}

            </select>

          </div>

        </section>

        {/* Browser Notification */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            🔔 Browser Notifications
          </h2>

          <p className="mt-2 text-sm text-slate-500">
            Browser permission is required before
            Placement Assistant can show reminder
            notifications.
          </p>

          <div className="mt-4 rounded-xl bg-slate-50 p-4">

            <div className="flex items-center justify-between gap-4">

              <div>

                <p className="text-sm font-semibold text-slate-900">
                  Notification status
                </p>

                <p className="mt-1 text-xs text-slate-500">
                  {permission === 'granted'
                    ? 'Notifications are enabled.'
                    : permission === 'denied'
                    ? 'Notifications are blocked.'
                    : permission ===
                      'unsupported'
                    ? 'Notifications are not supported by this browser.'
                    : 'Permission has not been requested yet.'}
                </p>

              </div>

              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold ${
                  permission === 'granted'
                    ? 'bg-green-100 text-green-700'
                    : permission === 'denied'
                    ? 'bg-red-100 text-red-700'
                    : 'bg-yellow-100 text-yellow-700'
                }`}
              >
                {permission === 'granted'
                  ? 'Enabled'
                  : permission === 'denied'
                  ? 'Blocked'
                  : 'Not Enabled'}
              </span>

            </div>

          </div>

          {permission !== 'granted' &&
            permission !== 'unsupported' && (

              <button
                onClick={
                  handleEnableNotifications
                }
                className="mt-4 w-full rounded-xl bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700"
              >
                Enable Browser Notifications
              </button>

            )}

          {permission === 'granted' && (

            <button
              onClick={
                handleTestNotification
              }
              className="mt-4 w-full rounded-xl border border-slate-300 bg-white py-3 font-semibold text-slate-700 hover:bg-slate-50"
            >
              🔔 Send Test Notification
            </button>

          )}

          {testMessage && (

            <div className="mt-4 rounded-xl bg-blue-50 p-4 text-sm text-blue-700">
              {testMessage}
            </div>

          )}

        </section>

        {/* How It Works */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            🔔 How reminders work
          </h2>

          <div className="mt-4 space-y-3">

            <div className="flex gap-3">

              <span className="font-bold text-blue-600">
                1
              </span>

              <p className="text-sm text-slate-600">
                Enable browser notifications.
              </p>

            </div>

            <div className="flex gap-3">

              <span className="font-bold text-blue-600">
                2
              </span>

              <p className="text-sm text-slate-600">
                Choose how early you want to
                be reminded.
              </p>

            </div>

            <div className="flex gap-3">

              <span className="font-bold text-blue-600">
                3
              </span>

              <p className="text-sm text-slate-600">
                Placement Assistant checks all
                published placement events.
              </p>

            </div>

            <div className="flex gap-3">

              <span className="font-bold text-blue-600">
                4
              </span>

              <p className="text-sm text-slate-600">
                You receive a browser notification
                before the event.
              </p>

            </div>

          </div>

        </section>

        {/* Upcoming Events */}

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <h2 className="text-lg font-bold text-slate-900">
            Upcoming Events
          </h2>

          <p className="mt-1 text-sm text-slate-500">
            Reminders can be generated for all
            published company events.
          </p>

          {upcomingEvents.length === 0 ? (

            <div className="mt-4 rounded-xl bg-slate-50 p-4">

              <p className="text-sm text-slate-500">
                No upcoming placement events.
              </p>

            </div>

          ) : (

            <div className="mt-4 space-y-3">

              {upcomingEvents
                .slice(0, 5)
                .map((event) => (

                  <div
                    key={event.id}
                    className="rounded-xl bg-slate-50 p-4"
                  >

                    <p className="font-semibold text-slate-900">
                      {event.company}
                    </p>

                    <p className="mt-1 text-sm text-slate-600">
                      {event.type}
                    </p>

                    <p className="mt-1 text-xs text-slate-500">
                      {formatDate(event.date)}
                    </p>

                  </div>

                ))}

            </div>

          )}

        </section>

      </main>

    </div>
  )
}

export default ReminderSettings