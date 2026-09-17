export const MAX_RESUME_SIZE =
  5 * 1024 * 1024

export const MAX_JD_SIZE =
  10 * 1024 * 1024

export const MAX_EXCEL_SIZE =
  5 * 1024 * 1024

const resumeMimeTypes = {
  pdf: ['application/pdf'],
  doc: [
    'application/msword',
    'application/vnd.ms-word',
    'application/x-ole-storage',
  ],
  docx: [
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  ],
}

const excelMimeTypes = {
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  xlsm: [
    'application/vnd.ms-excel.sheet.macroenabled.12',
  ],
}

function fileExtension(file) {
  return file?.name
    ?.split('.')
    .pop()
    ?.toLowerCase() || ''
}

function mimeMatches(file, allowedTypes) {
  if (!file.type) {
    return true
  }

  return allowedTypes.includes(
    file.type.toLowerCase()
  )
}

export function validateResumeFile(file) {
  const extension = fileExtension(file)
  const allowedTypes =
    resumeMimeTypes[extension]

  if (
    !allowedTypes ||
    !mimeMatches(file, allowedTypes)
  ) {
    return 'Please select a PDF, DOC, or DOCX file whose type matches its extension.'
  }

  if (file.size > MAX_RESUME_SIZE) {
    return 'Resume files must be 5 MB or smaller.'
  }

  return ''
}

export function validateJdFile(file) {
  if (
    fileExtension(file) !== 'pdf' ||
    !mimeMatches(
      file,
      ['application/pdf']
    )
  ) {
    return 'Only PDF files are allowed for the Job Description.'
  }

  if (file.size > MAX_JD_SIZE) {
    return 'Job Description files must be 10 MB or smaller.'
  }

  return ''
}

export function validateExcelFile(file) {
  const extension = fileExtension(file)
  const allowedTypes =
    excelMimeTypes[extension]

  if (
    !allowedTypes ||
    !mimeMatches(file, allowedTypes)
  ) {
    return 'Please select an Excel file (.xlsx or .xlsm) whose type matches its extension.'
  }

  if (file.size > MAX_EXCEL_SIZE) {
    return 'Round-result Excel files must be 5 MB or smaller.'
  }

  return ''
}
