import {
  BrowserRouter,
  Routes,
  Route,
} from 'react-router-dom'

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
import WithdrawnDrives from './pages/admin/WithdrawnDrives'
import UpcomingEvents from './pages/admin/UpcomingEvents'

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

                {/* =========================
                    LOGIN
                ========================= */}

                <Route
                  path="/"
                  element={<Login />}
                />


                {/* =========================
                    STUDENT
                ========================= */}

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


                {/* =========================
                    ADMIN DASHBOARD
                ========================= */}

                <Route
                  path="/admin"
                  element={<AdminDashboard />}
                />


                {/* =========================
                    ADMIN CREATE DRIVE
                ========================= */}

                <Route
                  path="/admin/create-drive"
                  element={<CreateDrive />}
                />


                {/* =========================
                    ADMIN DRIVE PREVIEW
                ========================= */}

                <Route
                  path="/admin/drive-preview"
                  element={<DrivePreview />}
                />


                {/* =========================
                    ADMIN DRIVE DETAILS
                ========================= */}

                <Route
                  path="/admin/drive/:id"
                  element={<AdminDriveDetails />}
                />


                {/* =========================
                    ADMIN EDIT DRIVE
                ========================= */}

                <Route
                  path="/admin/edit-drive/:id"
                  element={<EditDrive />}
                />


                {/* =========================
                    ADMIN APPLICATIONS
                ========================= */}

                <Route
                  path="/admin/applications"
                  element={
                    <ApplicationsManagement />
                  }
                />


                {/* =========================
                    ADMIN UPCOMING EVENTS
                ========================= */}

                <Route
                  path="/admin/upcoming-events"
                  element={
                    <UpcomingEvents />
                  }
                />


                {/* =========================
                    ADMIN WITHDRAWN DRIVES
                ========================= */}

                <Route
                  path="/admin/withdrawn-drives"
                  element={
                    <WithdrawnDrives />
                  }
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