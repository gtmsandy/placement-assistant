const API_BASE_URL =
  'http://127.0.0.1:8000'


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
  if (typeof window !== 'undefined') {
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
    localStorage.getItem('user')

  if (!storedUser) {
    return null
  }

  try {
    return JSON.parse(storedUser)
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
    const message =
      typeof data === 'object' &&
      data?.detail
        ? data.detail
        : typeof data === 'string' &&
          data
          ? data
          : `Request failed with status ${response.status}`

    throw new Error(
      message
    )
  }

  return data
}


export async function loginUser(
  identifier,
  password,
  role
) {
  const response =
    await fetch(
      `${API_BASE_URL}/api/auth/login`,
      {
        method: 'POST',

        headers: {
          'Content-Type':
            'application/json',
        },

        body: JSON.stringify({
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
  const response =
    await fetch(
      `${API_BASE_URL}/api/students/${studentId}`,
      {
        headers:
          getAuthHeaders(),
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
  const response =
    await fetch(
      `${API_BASE_URL}/api/students/${studentId}`,
      {
        method: 'PATCH',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body: JSON.stringify(
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
        method: 'POST',

        headers:
          getAuthHeaders(),

        body: formData,
      }
    )

  return parseResponse(
    response
  )
}


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
        method: 'POST',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body: JSON.stringify(
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
  const response =
    await fetch(
      `${API_BASE_URL}/api/drives/${driveId}`,
      {
        method: 'PATCH',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body: JSON.stringify(
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


export async function uploadJobDescription(
  driveId,
  file
) {
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
        method: 'POST',

        headers:
          getAuthHeaders(),

        body: formData,
      }
    )

  return parseResponse(
    response
  )
}


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
  const response =
    await fetch(
      `${API_BASE_URL}/api/applications/`,
      {
        method: 'POST',

        headers:
          getAuthHeaders({
            'Content-Type':
              'application/json',
          }),

        body: JSON.stringify({
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
    (query
      ? `?${query}`
      : '')

  const response =
    await fetch(
      url,
      {
        method: 'PATCH',

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
