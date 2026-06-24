import dayjs from 'dayjs'
import Papa from 'papaparse'
import { collection, getDocs } from 'firebase/firestore'

// Shared personnel-export helpers used by both the Migration page and the
// Personnel (UsersView) page so every CSV they produce has the same shape.

// Whether the user has met the training required to be approved.
//
// Pending users can't rely on MissingTrainingIds (the backend only populates it
// at/after approval), so we read their UserCorpTraining and require every
// pre-acceptance training (Complete === 0) to be completed and not expired
// (mirrors the red/green logic in UsersViewTrainingList.vue). Once a user has
// gone through approval, MissingTrainingIds is the canonical signal.
export const isTrainingComplete = (uc, userCorpTraining) => {
  if (uc.Status === 'Pending Approval') {
    return (userCorpTraining || [])
      .filter((t) => Number(t.Complete) === 0)
      .every((t) => t.ExpiresOn && dayjs().isBefore(dayjs(t.ExpiresOn)))
  }
  return (uc.MissingTrainingIds || []).length === 0
}

// Read a single user-corp's UserCorpTraining subcollection. A plain
// subcollection read (no where/orderBy) never requires a composite index.
const fetchUserCorpTrainingFor = async (db, userCorpId) => {
  const snap = await getDocs(collection(db, 'UsersCorporations', userCorpId, 'UserCorpTraining'))
  return snap.docs.map((d) => d.data())
}

// Fetch UserCorpTraining for the given user-corp ids (only needed for pending
// users), returning a map of userCorpId -> training docs[].
export const fetchPendingTraining = async (db, userCorpIds) => {
  const map = {}
  await Promise.all(
    userCorpIds.map(async (id) => {
      map[id] = await fetchUserCorpTrainingFor(db, id)
    })
  )
  return map
}

// Build one CSV row from a user-corporation joined with its user.
// Pass includeCorporation = true for cross-corporation exports (adds a
// leading Corporation column); false when every row is the same corporation.
// userCorpTraining is only consulted for pending users (see isTrainingComplete).
export const buildPersonnelRow = (uc, user, includeCorporation, userCorpTraining) => {
  const trainingDone = isTrainingComplete(uc, userCorpTraining)

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
