import {
  validateExcelFile,
  validateJdFile,
  validateResumeFile,
} from './uploadValidation'


const configuredApiBaseUrl =
  import.meta.env.VITE_API_BASE_URL?.trim()

if (
  !configuredApiBaseUrl &&
  import.meta.env.PROD
) {
  throw new Error(
    'VITE_API_BASE_URL is required in production.'
  )
}

const API_BASE_URL =
  configuredApiBaseUrl ||
  'http://127.0.0.1:8001'


export function getAuthToken() {
  return localStorage.getItem(
    'access_token'
  )
}


export function getAuthHeaders(
  additionalHeaders = {}
) {
  const token =
    getAuthToken()

  return {
    ...additionalHeaders,

    ...(token
      ? {
          Authorization:
            `Bearer ${token}`,
        }
      : {}),
  }
}


function notifyAuthChanged() {
  if (
    typeof window !==
    'undefined'
  ) {
    window.dispatchEvent(
      new Event('auth-changed')
    )
  }
}


export function clearAuth() {
  localStorage.removeItem(
    'access_token'
  )

  localStorage.removeItem(
    'user'
  )

  notifyAuthChanged()
}


export function logoutUser() {
  clearAuth()
}


export function getStoredUser() {
  const storedUser =
    localStorage.getItem(
      'user'
    )

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(
      storedUser
    )
  } catch {
    return null
  }
}


export function getAccessToken() {
  return getAuthToken()
}


async function parseResponse(
  response
) {
  const contentType =
    response.headers.get(
      'content-type'
    )

  let data = null

  if (
    contentType &&
    contentType.includes(
      'application/json'
    )
  ) {
    data =
      await response.json()
  } else {
    data =
      await response.text()
  }

  if (!response.ok) {
    let message =
      `Request failed with status ${response.status}`

    if (
      typeof data ===
        'string' &&
      data.trim()
    ) {
      message =
        data

    } else if (
      data &&
      typeof data ===
        'object'
    ) {
      if (
        typeof data.detail ===
        'string'
      ) {
        message =
          data.detail

      } else if (
        Array.isArray(
          data.detail
        )
      ) {
        message =
          data.detail
            .map(
              item =>
                item?.msg ||
                JSON.stringify(
                  item
                )
            )
            .join(', ')

      } else if (
        data.detail &&
        typeof data.detail ===
          'object'
      ) {
        message =
          JSON.stringify(
            data.detail,
            null,
            2
          )

      } else if (
        typeof data.message ===
        'string'
      ) {
        message =
          data.message

      } else if (
        data.message &&
        typeof data.message ===
          'object'
      ) {
        message =
          JSON.stringify(
            data.message,
            null,
            2
          )

      } else {
        message =
          JSON.stringify(
            data,
            null,
            2
          )
      }
    }

    throw new Error(
      message
    )
  }

  return data
}


async function openProtectedFile(
  endpoint
) {
  const previewWindow =
    window.open('', '_blank')

  if (!previewWindow) {
    throw new Error(
      'Allow pop-ups to view this file.'
    )
  }

  previewWindow.opener = null

  try {
    const response =
      await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          headers:
            getAuthHeaders(),
        }
      )

    if (!response.ok) {
      await parseResponse(
        response
      )
    }

    const blob =
      await response.blob()
    const objectUrl =
      URL.createObjectURL(blob)

    previewWindow.location.replace(
      objectUrl
    )

    window.setTimeout(
      () => {
        URL.revokeObjectURL(
          objectUrl
        )
      },
      60_000
    )
  } catch (error) {
    previewWindow.close()
    throw error
  }
}


/* =========================
   AUTHENTICATION
   ========================= */

export async function loginUser(
  identifier,
  password,
  role
) {
  const response =
    await fetch(
      `${API_BASE_URL}/api/auth/login`,
      {
        method:
          'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body:
          JSON.stringify({
            identifier,
            password,
            role,
          }),
      }
    )

  const data =
    await parseResponse(
      response
    )

  if (
    !data ||
    !data.access_token
  ) {
    throw new Error(
      'Login succeeded but no access token was returned.'
    )
  }

  localStorage.setItem(
    'access_token',
    data.access_token
  )

  if (data.user) {
    localStorage.setItem(
      'user',
      JSON.stringify(
        data.user
      )
    )
  }

  notifyAuthChanged()

  return data
}


export async function getMe() {
  const response =
    await fetch(
      `${API_BASE_URL}/api/auth/me`,
      {
        headers:
          getAuthHeaders(),
      }
    )

  return parseResponse(
    response
  )
}


/* =========================
   STUDENTS
   ========================= */

export async function getStudents() {
  const response =
    await fetch(
      `${API_BASE_URL}/api/students/`,
      {
        headers:
          getAuthHeaders(),
      }
    )

  return parseResponse(
    response
  )
}


export async function getStudent(
  studentId
) {
  if (!studentId) {
    throw new Error(
      'Student ID is missing.'
    )
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/students/${studentId}`,
      {
        headers:
          getAuthHeaders(),
        cache: 'no-store',
      }
    )

  return parseResponse(
    response
  )
}


export async function updateStudent(
  studentId,
  studentData
) {
  if (!studentId) {
    throw new Error(
      'Student ID is missing.'
    )
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/students/${studentId}`,
      {
        method:
          'PATCH',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body:
          JSON.stringify(
            studentData
          ),
      }
    )

  return parseResponse(
    response
  )
}


export async function uploadResume(
  studentId,
  file
) {
  if (!studentId) {
    throw new Error(
      'Student ID is missing.'
    )
  }

  if (!file) {
    throw new Error(
      'Please select a resume file.'
    )
  }

  const validationError =
    validateResumeFile(file)

  if (validationError) {
    throw new Error(
      validationError
    )
  }

  const formData =
    new FormData()

  formData.append(
    'file',
    file
  )

  const response =
    await fetch(
      `${API_BASE_URL}/api/students/${studentId}/resume`,
      {
        method:
          'POST',

        headers:
          getAuthHeaders(),

        body:
          formData,
      }
    )

  return parseResponse(
    response
  )
}


export async function viewStudentResume(
  studentId
) {
  if (!studentId) {
    throw new Error(
      'Student ID is missing.'
    )
  }

  return openProtectedFile(
    `/api/students/${studentId}/resume`
  )
}


/* =========================
   PLACEMENT DRIVES
   ========================= */

export async function getDrives() {
  const response =
    await fetch(
      `${API_BASE_URL}/api/drives/`,
      {
        headers:
          getAuthHeaders(),
      }
    )

  return parseResponse(
    response
  )
}


export async function getDrive(
  driveId
) {
  if (!driveId) {
    throw new Error(
      'Drive ID is missing.'
    )
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/drives/${driveId}`,
      {
        headers:
          getAuthHeaders(),
      }
    )

  return parseResponse(
    response
  )
}


export async function createDrive(
  drive
) {
  const response =
    await fetch(
      `${API_BASE_URL}/api/drives/`,
      {
        method:
          'POST',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body:
          JSON.stringify(
            drive
          ),
      }
    )

  return parseResponse(
    response
  )
}


export async function updateDrive(
  driveId,
  drive
) {
  if (!driveId) {
    throw new Error(
      'Drive ID is missing.'
    )
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/drives/${driveId}`,
      {
        method:
          'PATCH',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body:
          JSON.stringify(
            drive
          ),
      }
    )

  return parseResponse(
    response
  )
}


export async function withdrawDrive(
  driveId
) {
  return updateDrive(
    driveId,
    {
      status:
        'Withdrawn',
    }
  )
}


/* =========================
   JOB DESCRIPTION
   ========================= */

export async function uploadJobDescription(
  driveId,
  file
) {
  if (!driveId) {
    throw new Error(
      'Drive ID is missing.'
    )
  }

  if (!file) {
    throw new Error(
      'Please select a PDF file.'
    )
  }

  const validationError =
    validateJdFile(file)

  if (validationError) {
    throw new Error(
      validationError
    )
  }

  const formData =
    new FormData()

  formData.append(
    'file',
    file
  )

  const response =
    await fetch(
      `${API_BASE_URL}/api/drives/${driveId}/jd`,
      {
        method:
          'POST',

        headers:
          getAuthHeaders(),

        body:
          formData,
      }
    )

  return parseResponse(
    response
  )
}


export async function viewDriveJobDescription(
  driveId
) {
  if (!driveId) {
    throw new Error(
      'Drive ID is missing.'
    )
  }

  return openProtectedFile(
    `/api/drives/${driveId}/jd`
  )
}


/* =========================
   ROUND RESULTS
   ========================= */

function normalizeRoundName(
  roundName
) {
  if (!roundName) {
    return ''
  }

  const value =
    String(
      roundName
    )
      .trim()
      .toLowerCase()

  if (
    value ===
    'resume shortlisting'
  ) {
    return 'Resume Shortlisting'
  }

  if (
    value ===
      'ppt'
  ) {
    return 'PPT'
  }

  if (
    value ===
      'online test' ||
    value ===
      'online_test' ||
    value ===
      'onlinetest'
  ) {
    return 'Online Test'
  }

  if (
    value ===
      'interview'
  ) {
    return 'Interview'
  }

  if (
    value ===
      'result'
  ) {
    return 'Result'
  }

  return roundName
}


export async function uploadRoundResults(
  driveId,
  roundName,
  file
) {
  if (!driveId) {
    throw new Error(
      'Drive ID is missing.'
    )
  }

  if (!roundName) {
    throw new Error(
      'Recruitment round is missing.'
    )
  }

  if (!file) {
    throw new Error(
      'Please select an Excel file.'
    )
  }

  const validationError =
    validateExcelFile(file)

  if (validationError) {
    throw new Error(
      validationError
    )
  }

  const stage =
    normalizeRoundName(
      roundName
    )

  const validStages = [
    'Resume Shortlisting',
    'PPT',
    'Online Test',
    'Interview',
    'Result',
  ]

  if (
    !validStages.includes(
      stage
    )
  ) {
    throw new Error(
      `Invalid recruitment round: ${stage}`
    )
  }

  const formData =
    new FormData()

  formData.append(
    'stage',
    stage
  )

  formData.append(
    'file',
    file
  )

  const response =
    await fetch(
      `${API_BASE_URL}/api/drives/${driveId}/round-results`,
      {
        method:
          'POST',

        headers:
          getAuthHeaders(),

        body:
          formData,
      }
    )

  return parseResponse(
    response
  )
}


/* =========================
   APPLICATIONS
   ========================= */

export async function getApplications() {
  const response =
    await fetch(
      `${API_BASE_URL}/api/applications/`,
      {
        headers:
          getAuthHeaders(),
      }
    )

  return parseResponse(
    response
  )
}


export async function createApplication(
  studentId,
  driveId
) {
  if (!studentId) {
    throw new Error(
      'Student ID is missing.'
    )
  }

  if (!driveId) {
    throw new Error(
      'Drive ID is missing.'
    )
  }

  const response =
    await fetch(
      `${API_BASE_URL}/api/applications/`,
      {
        method:
          'POST',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body:
          JSON.stringify({
            student_id:
              studentId,

            drive_id:
              driveId,
          }),
      }
    )

  return parseResponse(
    response
  )
}


export async function updateApplication(
  applicationId,
  status,
  currentStage
) {
  if (!applicationId) {
    throw new Error(
      'Application ID is missing.'
    )
  }

  const params =
    new URLSearchParams()

  if (status) {
    params.set(
      'status',
      status
    )
  }

  if (currentStage) {
    params.set(
      'current_stage',
      currentStage
    )
  }

  const query =
    params.toString()

  const url =
    `${API_BASE_URL}/api/applications/${applicationId}` +
    (
      query
        ? `?${query}`
        : ''
    )

  const response =
    await fetch(
      url,
      {
        method:
          'PATCH',

        headers:
          getAuthHeaders(),
      }
    )

  return parseResponse(
    response
  )
}


export {
  API_BASE_URL,
}
