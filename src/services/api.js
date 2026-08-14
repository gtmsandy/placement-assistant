const API_BASE_URL =
  'http://127.0.0.1:8000/api'


async function request(
  endpoint,
  options = {}
) {
  try {
    const response = await fetch(
      `${API_BASE_URL}${endpoint}`,
      {
        ...options,

        headers: {
          'Content-Type':
            'application/json',

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