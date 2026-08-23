import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
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

import ProtectedRoute from './components/ProtectedRoute'

import { PlacementProvider } from './context/PlacementContext'
import { StudentProvider } from './context/StudentContext'
import { ApplicationProvider } from './context/ApplicationContext'
import { ReminderProvider } from './context/ReminderContext'


function App() {

  return (
    <BrowserRouter>

      <StudentProvider>

        <PlacementProvider>

          <ApplicationProvider>

            <ReminderProvider>

              <Routes>

                <Route
                  path="/"
                  element={
                    <Navigate
                      to="/login"
                      replace
                    />
                  }
                />


                <Route
                  path="/login"
                  element={<Login />}
                />


                {/* =========================
                    STUDENT ROUTES
                ========================= */}

                <Route
                  path="/student"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'student',
                      ]}
                    >
                      <StudentDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/profile"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'student',
                      ]}
                    >
                      <StudentProfile />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/applications"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'student',
                      ]}
                    >
                      <Applications />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/calendar"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'student',
                      ]}
                    >
                      <Calendar />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/reminders"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'student',
                      ]}
                    >
                      <ReminderSettings />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/student/opportunity/:id"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'student',
                      ]}
                    >
                      <OpportunityDetails />
                    </ProtectedRoute>
                  }
                />


                {/* =========================
                    ADMIN ROUTES
                ========================= */}

                <Route
                  path="/admin"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <AdminDashboard />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/create-drive"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <CreateDrive />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/drive-preview"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <DrivePreview />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/drive/:id"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <AdminDriveDetails />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/edit-drive/:id"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <EditDrive />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/applications"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <ApplicationsManagement />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/upcoming-events"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <UpcomingEvents />
                    </ProtectedRoute>
                  }
                />

                <Route
                  path="/admin/withdrawn-drives"
                  element={
                    <ProtectedRoute
                      allowedRoles={[
                        'admin',
                      ]}
                    >
                      <WithdrawnDrives />
                    </ProtectedRoute>
                  }
                />


                {/* =========================
                    FALLBACK
                ========================= */}

                <Route
                  path="*"
                  element={
                    <Navigate
                      to="/login"
                      replace
                    />
                  }
                />

              </Routes>

            </ReminderProvider>

          </ApplicationProvider>

        </PlacementProvider>

      </StudentProvider>

    </BrowserRouter>
  )
}


export default App