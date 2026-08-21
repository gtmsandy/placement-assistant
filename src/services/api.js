const API_BASE_URL =
  'http://127.0.0.1:8000/api'


async function request(
  endpoint,
  options = {}
) {
  try {
    const token =
      localStorage.getItem(
        'access_token'
      )

    const response =
      await fetch(
        `${API_BASE_URL}${endpoint}`,
        {
          ...options,

          headers: {
            'Content-Type':
              'application/json',

            ...(token
              ? {
                  Authorization:
                    `Bearer ${token}`,
                }
              : {}),

            ...(options.headers || {}),
          },
        }
      )

    const text =
      await response.text()

    let data = null

    try {
      data = text
        ? JSON.parse(text)
        : null
    } catch {
      data = text
    }

    if (!response.ok) {
      const detail =
        data?.detail ||
        data?.message ||
        data ||
        `API request failed with status ${response.status}`

      throw new Error(
        typeof detail === 'string'
          ? detail
          : JSON.stringify(detail)
      )
    }

    return data

  } catch (error) {

    console.error(
      `API request failed: ${endpoint}`,
      error
    )

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
    await request(
      '/auth/login',
      {
        method: 'POST',

        body: JSON.stringify({
          identifier,
          password,
          role,
        }),
      }
    )

  localStorage.setItem(
    'access_token',
    response.access_token
  )

  localStorage.setItem(
    'user',
    JSON.stringify(
      response.user
    )
  )

  return response
}


export function logoutUser() {

  localStorage.removeItem(
    'access_token'
  )

  localStorage.removeItem(
    'user'
  )
}


export function getStoredUser() {

  const user =
    localStorage.getItem(
      'user'
    )

  if (!user) {
    return null
  }

  try {
    return JSON.parse(user)
  } catch {
    return null
  }
}


export function getAccessToken() {

  return localStorage.getItem(
    'access_token'
  )
}


/* =========================
   STUDENTS
========================= */

export async function getStudents() {

  return request(
    '/students/'
  )
}


export async function getStudent(
  studentId
) {

  return request(
    `/students/${studentId}`
  )
}


export async function createStudent(
  student
) {

  return request(
    '/students/',
    {
      method: 'POST',

      body: JSON.stringify(
        student
      ),
    }
  )
}


export async function updateStudent(
  studentId,
  student
) {

  return request(
    `/students/${studentId}`,
    {
      method: 'PATCH',

      body: JSON.stringify(
        student
      ),
    }
  )
}


/* =========================
   STUDENT RESUME
========================= */

export async function uploadResume(
  studentId,
  file
) {

  if (!studentId) {
    throw new Error(
      'Student ID is missing'
    )
  }

  if (!file) {
    throw new Error(
      'Please select a resume file'
    )
  }


  const formData =
    new FormData()

  formData.append(
    'file',
    file
  )


  const token =
    localStorage.getItem(
      'access_token'
    )


  const response =
    await fetch(
      `${API_BASE_URL}/students/${studentId}/resume`,
      {
        method: 'POST',

        headers: {
          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        },

        body: formData,
      }
    )


  const text =
    await response.text()


  let data = null

  try {

    data = text
      ? JSON.parse(text)
      : null

  } catch {

    data = text
  }


  if (!response.ok) {

    const detail =
      data?.detail ||
      data?.message ||
      data ||
      `Resume upload failed with status ${response.status}`

    throw new Error(
      typeof detail === 'string'
        ? detail
        : JSON.stringify(detail)
    )
  }


  return data
}


/* =========================
   PLACEMENT DRIVES
========================= */

export async function getDrives() {

  return request(
    '/drives/'
  )
}


export async function getDrive(
  driveId
) {

  return request(
    `/drives/${driveId}`
  )
}


export async function createDrive(
  drive
) {

  console.log(
    'Creating placement drive:',
    drive
  )

  return request(
    '/drives/',
    {
      method: 'POST',

      body: JSON.stringify(
        drive
      ),
    }
  )
}


export async function updateDrive(
  driveId,
  drive
) {

  console.log(
    'Updating placement drive:',
    driveId,
    drive
  )

  return request(
    `/drives/${driveId}`,
    {
      method: 'PATCH',

      body: JSON.stringify(
        drive
      ),
    }
  )
}


export async function withdrawDrive(
  driveId
) {

  console.log(
    'Withdrawing placement drive:',
    driveId
  )

  return updateDrive(
    driveId,
    {
      status: 'Withdrawn',
    }
  )
}


export async function uploadJobDescription(
  driveId,
  file
) {

  if (!file) {
    throw new Error(
      'Please select a job description file'
    )
  }


  const formData =
    new FormData()

  formData.append(
    'file',
    file
  )


  const token =
    localStorage.getItem(
      'access_token'
    )


  const response =
    await fetch(
      `${API_BASE_URL}/drives/${driveId}/jd`,
      {
        method: 'POST',

        headers: {
          ...(token
            ? {
                Authorization:
                  `Bearer ${token}`,
              }
            : {}),
        },

        body: formData,
      }
    )


  const text =
    await response.text()


  let data = null

  try {

    data = text
      ? JSON.parse(text)
      : null

  } catch {

    data = text
  }


  if (!response.ok) {

    const detail =
      data?.detail ||
      data?.message ||
      data ||
      `JD upload failed with status ${response.status}`

    throw new Error(
      typeof detail === 'string'
        ? detail
        : JSON.stringify(detail)
    )
  }


  return data
}


/* =========================
   APPLICATIONS
========================= */

export async function getApplications() {

  return request(
    '/applications/'
  )
}


export async function createApplication(
  studentId,
  driveId
) {

  return request(
    '/applications/',
    {
      method: 'POST',

      body: JSON.stringify({
        student_id:
          studentId,

        drive_id:
          driveId,
      }),
    }
  )
}


export async function updateApplicationStatus(
  applicationId,
  status,
  currentStage = 'Applied'
) {

  return request(
    `/applications/${applicationId}?status=${encodeURIComponent(status)}&current_stage=${encodeURIComponent(currentStage)}`,
    {
      method: 'PATCH',
    }
  )
}