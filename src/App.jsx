import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Login from './pages/auth/Login'

import StudentDashboard from './pages/student/StudentDashboard'
import StudentProfile from './pages/student/StudentProfile'
import OpportunityDetails from './pages/student/OpportunityDetails'
import Applications from './pages/student/Applications'
import Calendar from './pages/student/Calendar'
import ReminderSettings from './pages/student/ReminderSettings'

import AdminDashboard from './pages/admin/AdminDashboard'
import CreateDrive from './pages/admin/CreateDrive'
import DrivePreview from './pages/admin/DrivePreview'
import AdminDriveDetails from './pages/admin/AdminDriveDetails'
import EditDrive from './pages/admin/EditDrive'
import ApplicationsManagement from './pages/admin/ApplicationsManagement'

import { PlacementProvider } from './context/PlacementContext'
import { StudentProvider } from './context/StudentContext'
import { ApplicationProvider } from './context/ApplicationContext'
import { ReminderProvider } from './context/ReminderContext'

function App() {
  return (
    <StudentProvider>
      <PlacementProvider>
        <ApplicationProvider>
          <ReminderProvider>

            <BrowserRouter>

              <Routes>

                {/* Login */}

                <Route
                  path="/"
                  element={<Login />}
                />

                {/* Student */}

                <Route
                  path="/student"
                  element={<StudentDashboard />}
                />

                <Route
                  path="/student/profile"
                  element={<StudentProfile />}
                />

                <Route
                  path="/student/applications"
                  element={<Applications />}
                />

                <Route
                  path="/student/calendar"
                  element={<Calendar />}
                />

                <Route
                  path="/student/reminders"
                  element={<ReminderSettings />}
                />

                <Route
                  path="/student/opportunity/:id"
                  element={<OpportunityDetails />}
                />

                {/* Admin */}

                <Route
                  path="/admin"
                  element={<AdminDashboard />}
                />

                <Route
                  path="/admin/create-drive"
                  element={<CreateDrive />}
                />

                <Route
                  path="/admin/drive-preview"
                  element={<DrivePreview />}
                />

                {/* Admin Drive Details */}

                <Route
                  path="/admin/drive/:id"
                  element={<AdminDriveDetails />}
                />

                {/* Admin Edit Drive */}

                <Route
                  path="/admin/edit-drive/:id"
                  element={<EditDrive />}
                />

                {/* Admin Applications */}

                <Route
                  path="/admin/applications"
                  element={<ApplicationsManagement />}
                />

              </Routes>

            </BrowserRouter>

          </ReminderProvider>
        </ApplicationProvider>
      </PlacementProvider>
    </StudentProvider>
  )
}

export default App