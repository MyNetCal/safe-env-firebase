import dayjs from 'dayjs'
import Papa from 'papaparse'

// Shared personnel-export helpers used by both the Migration page and the
// Personnel (UsersView) page so every CSV they produce has the same shape.

// Build one CSV row from a user-corporation joined with its user.
// Pass includeCorporation = true for cross-corporation exports (adds a
// leading Corporation column); false when every row is the same corporation.
export const buildPersonnelRow = (uc, user, includeCorporation) => {
  // Training: the backend keeps MissingTrainingIds[] on the user-corp; empty = complete.
  const trainingDone = (uc.MissingTrainingIds || []).length === 0

  // Background check: Junior Counselors are exempt (NA); otherwise expired beats the flag.
  let backgroundCheck
  if (uc.Function === 'Junior Counselor') {
    backgroundCheck = 'NA'
  } else {
    const bgExpiresOn = uc.BackgroundCheckExpiresOn || user.BackgroundCheckExpiresOn
    if (bgExpiresOn && dayjs(bgExpiresOn).isBefore(dayjs())) {
      backgroundCheck = 'Expired'
    } else {
      backgroundCheck = uc.ScreeningReqFlagBackground ? 'Y' : 'N'
    }
  }

  const row = {
    First: user.Name || '',
    Last: user.LastName || '',
    Email: user.Email || '',
    Status: uc.Status || '',
    'Attention Reason': (uc.StatusRquiringAttentionReasons || []).join(', '),
    Training: trainingDone ? 'Y' : 'N',
    'Code of Conduct': uc.ScreeningReqFlagCode ? 'Y' : 'N',
    'Consent Release': uc.ScreeningReqFlagConsent ? 'Y' : 'N',
    'Background Check': backgroundCheck
  }
  return includeCorporation ? { Corporation: uc.CorporationName || '', ...row } : row
}

// Turn rows into a CSV file and trigger a browser download.
export const downloadCsv = (rows, filename) => {
  const csv = Papa.unparse(rows)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

export const todayStr = () => new Date().toISOString().slice(0, 10)

// Slugify a corporation name for use in a filename.
export const slugify = (s) => (s || 'corporation').replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '')
