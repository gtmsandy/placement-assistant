import { useNavigate } from 'react-router-dom'
import { useReminders } from '../../context/ReminderContext'

function ReminderSettings() {
  const navigate = useNavigate()

  const {
    settings,
    updateReminderSettings,
  } = useReminders()

  return (
    <div className="min-h-screen bg-slate-50 pb-10">

      <header className="border-b border-slate-200 bg-white px-5 py-5">
        <div className="mx-auto max-w-3xl">

          <button
            onClick={() => navigate('/student/calendar')}
            className="text-sm font-medium text-blue-600"
          >
            ← Back to Calendar
          </button>

          <h1 className="mt-4 text-2xl font-bold text-slate-900">
            Reminder Settings
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Choose when you want to be reminded about placement events.
          </p>

        </div>
      </header>

      <main className="mx-auto max-w-3xl px-5 py-8">

        <section className="rounded-2xl bg-white p-6 shadow-sm">

          <div className="flex items-center justify-between gap-4">

            <div>
              <h2 className="font-semibold text-slate-900">
                Placement Reminders
              </h2>

              <p className="mt-1 text-sm text-slate-500">
                Receive reminders before PPTs, tests, interviews and deadlines.
              </p>
            </div>

            <button
              type="button"
              onClick={() =>
                updateReminderSettings({
                  enabled: !settings.enabled,
                })
              }
              className={`relative h-7 w-12 rounded-full transition ${
                settings.enabled
                  ? 'bg-blue-600'
                  : 'bg-slate-300'
              }`}
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

          <div className="mt-8">

            <label className="text-sm font-semibold text-slate-900">
              Remind me before
            </label>

            <p className="mt-1 text-sm text-slate-500">
              This setting applies to all placement events.
            </p>

            <select
              value={settings.reminderMinutes}
              disabled={!settings.enabled}
              onChange={(event) =>
                updateReminderSettings({
                  reminderMinutes: Number(event.target.value),
                })
              }
              className="mt-4 w-full rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm disabled:bg-slate-100 disabled:text-slate-400"
            >
              <option value={180}>
                3 hours before
              </option>

              <option value={120}>
                2 hours before
              </option>

              <option value={60}>
                1 hour before
              </option>

              <option value={30}>
                30 minutes before
              </option>

              <option value={15}>
                15 minutes before
              </option>
            </select>

          </div>

          <div className="mt-6 rounded-xl bg-blue-50 p-4">

            <p className="text-sm font-semibold text-blue-800">
              🔔 How reminders work
            </p>

            <p className="mt-1 text-sm text-blue-700">
              You will receive a notification before an eligible
              placement event once browser notifications are enabled.
            </p>

          </div>

        </section>

      </main>

    </div>
  )
}

export default ReminderSettings