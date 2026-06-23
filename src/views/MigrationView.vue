<template>
  <div class="h-full overflow-y-auto">
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Data Migration Utility</h1>

    <!-- Export: All personnel across all corporations -->
    <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
      <h2 class="font-semibold text-blue-800">Export All Personnel</h2>
      <p class="text-blue-700 mt-2">
        Downloads a CSV with every person across all corporations and all statuses.
      </p>
      <button
        @click="downloadAllPersonnel"
        :disabled="isDownloadingAll"
        class="mt-3 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {{ isDownloadingAll ? 'Preparing...' : 'Download CSV' }}
      </button>
      <div v-if="errorDownloadAll" class="mt-2 text-red-700 text-sm">{{ errorDownloadAll }}</div>
    </div>

    <!-- Export: Personnel for the logged-in corporation -->
    <div class="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
      <h2 class="font-semibold text-blue-800">
        Export {{ loginCorporation?.Name || 'Corporation' }} Personnel
      </h2>
      <p class="text-blue-700 mt-2">
        Downloads a CSV with every person in
        {{ loginCorporation?.Name || 'your corporation' }} and all statuses.
      </p>
      <button
        @click="downloadCorpPersonnel"
        :disabled="isDownloadingCorp || !loginCorporationId || loginCorporationId === 'xxx'"
        class="mt-3 bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
      >
        {{ isDownloadingCorp ? 'Preparing...' : 'Download CSV' }}
      </button>
      <div v-if="errorDownloadCorp" class="mt-2 text-red-700 text-sm">{{ errorDownloadCorp }}</div>
    </div>

    <hr class="mb-6" />

    <!-- Cleanup: Remove stale 'No Active' from reactivated users -->
    <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
      <h2 class="font-semibold text-yellow-800">Remove stale "No Active" from reactivated users</h2>
      <p class="text-yellow-700 mt-2">
        Removes the "No Active" value from StatusRquiringAttentionReasons for all active
        UsersCorporations records. Safe to run multiple times.
      </p>
    </div>

    <div v-if="!isRunningCleanup && !isCompleteCleanup" class="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
      <button
        @click="runCleanup"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="isRunningCleanup"
      >
        Run Cleanup
      </button>
    </div>

    <div v-if="isRunningCleanup" class="bg-orange-50 border border-orange-200 rounded p-4 mb-6">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
        <span class="text-orange-800">{{ progressCleanup }}</span>
      </div>
    </div>

    <div v-if="isCompleteCleanup" class="bg-green-50 border border-green-200 rounded p-4 mb-6">
      <span class="text-green-800 font-semibold">{{ progressCleanup }}</span>
    </div>

    <div v-if="errorCleanup" class="bg-red-50 border border-red-200 rounded p-4 mb-6">
      <span class="text-red-800">{{ errorCleanup }}</span>
    </div>

    <hr class="mb-6" />

    <!-- Migration: Reset JC training request flags -->
    <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
      <h2 class="font-semibold text-yellow-800">Step 1 — Reset JC training request flags</h2>
      <p class="text-yellow-700 mt-2">
        Clears the PraesidiumTrainingRequested flag on all active Junior Counselors so the send step
        below can re-run for everyone. Run this before "Send Training Requests" if you need to retry.
      </p>
    </div>

    <div v-if="!isRunningResetJC && !isCompleteResetJC" class="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
      <button
        @click="runResetJC"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="isRunningResetJC"
      >
        Reset Flags
      </button>
    </div>

    <div v-if="isRunningResetJC" class="bg-orange-50 border border-orange-200 rounded p-4 mb-6">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
        <span class="text-orange-800">{{ progressResetJC }}</span>
      </div>
    </div>

    <div v-if="isCompleteResetJC" class="bg-green-50 border border-green-200 rounded p-4 mb-6">
      <span class="text-green-800 font-semibold">{{ progressResetJC }}</span>
    </div>

    <div v-if="errorResetJC" class="bg-red-50 border border-red-200 rounded p-4 mb-6">
      <span class="text-red-800">{{ errorResetJC }}</span>
    </div>

    <hr class="mb-6" />

    <!-- Migration: Send training request for existing Junior Counselors -->
    <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
      <h2 class="font-semibold text-yellow-800">Step 2 — Send Praesidium training request for existing Junior Counselors</h2>
      <p class="text-yellow-700 mt-2">
        Sends a training-only registration email to the Prelature SEC for every active Junior Counselor
        who has not yet had this request sent. Emails are spaced 1 second apart to avoid rate limiting.
      </p>
    </div>

    <div v-if="!isRunningJC && !isCompleteJC" class="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
      <button
        @click="runJCMigration"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="isRunningJC"
      >
        Send Training Requests
      </button>
    </div>

    <div v-if="isRunningJC" class="bg-orange-50 border border-orange-200 rounded p-4 mb-6">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
        <span class="text-orange-800">{{ progressJC }}</span>
      </div>
    </div>

    <div v-if="isCompleteJC" class="bg-green-50 border border-green-200 rounded p-4 mb-6">
      <span class="text-green-800 font-semibold">{{ progressJC }}</span>
    </div>

    <div v-if="errorJC" class="bg-red-50 border border-red-200 rounded p-4 mb-6">
      <span class="text-red-800">{{ errorJC }}</span>
    </div>

    <hr class="mb-6" />

    <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
      <h2 class="font-semibold text-yellow-800">⚠️ One-Time Migration Required</h2>
      <p class="text-yellow-700 mt-2">
        This tool adds Branch fields to existing Corporations, Participants, and Sites
        that don't have them. This ensures compatibility with the new multi-section system.
      </p>
    </div>

    <div v-if="!isRunning && !isComplete" class="bg-blue-50 border border-blue-200 rounded p-4">
      <button
        @click="runMigration"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="isRunning"
      >
        🚀 Run Migration
      </button>
      <p class="text-blue-700 mt-2 text-sm">
        This will update all existing records to include Branch fields. Safe to run multiple times.
      </p>
    </div>

    <div v-if="isRunning" class="bg-orange-50 border border-orange-200 rounded p-4">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
        <span class="text-orange-800">Running migration... {{ progress }}</span>
      </div>
    </div>

    <div v-if="isComplete" class="bg-green-50 border border-green-200 rounded p-4">
      <div class="flex items-center mb-2">
        <span class="text-green-600 text-xl mr-2">✅</span>
        <span class="text-green-800 font-semibold">Migration Complete!</span>
      </div>
      <p class="text-green-700">{{ results }}</p>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 rounded p-4 mt-4">
      <div class="flex items-center">
        <span class="text-red-600 text-xl mr-2">❌</span>
        <span class="text-red-800 font-semibold">Migration Failed</span>
      </div>
      <p class="text-red-700 mt-2">{{ error }}</p>
    </div>

    <hr class="mb-6" />

    <!-- Cleanup: Normalize Users email to lowercase -->
    <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
      <h2 class="font-semibold text-yellow-800">Normalize personnel emails to lowercase</h2>
      <p class="text-yellow-700 mt-2">
        Trims and lowercases the Email field on every Users record so it matches the
        (lowercased) Firebase Auth login email. A capitalized stored email makes the
        case-sensitive login lookup fail, giving the user a blank page and access level -2.
        Scan first to preview the affected records, then apply. Safe to run multiple times.
      </p>
    </div>

    <div v-if="!isRunningEmails" class="bg-blue-50 border border-blue-200 rounded p-4 mb-6">
      <button
        @click="scanEmails"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="isRunningEmails"
      >
        Scan Emails
      </button>

      <div v-if="emailScanned" class="mt-4">
        <p v-if="emailChanges.length === 0" class="text-green-700">
          All emails are already normalized. Nothing to do.
        </p>
        <div v-else>
          <p class="mb-2 font-medium text-slate-700">
            {{ emailChanges.length }} record(s) will be updated:
          </p>
          <div class="max-h-64 overflow-y-auto rounded border border-slate-200 bg-white text-sm">
            <div
              v-for="c in emailChanges"
              :key="c.id"
              class="border-b border-slate-100 px-3 py-1"
            >
              <span class="text-red-600">{{ c.from }}</span>
              <span class="text-slate-400"> → </span>
              <span class="text-green-700">{{ c.to }}</span>
            </div>
          </div>
          <button
            @click="applyEmails"
            class="mt-3 rounded bg-red-600 px-6 py-2 text-white hover:bg-red-700 disabled:opacity-50"
          >
            Apply {{ emailChanges.length }} Update(s)
          </button>
        </div>
      </div>
    </div>

    <div v-if="isRunningEmails" class="bg-orange-50 border border-orange-200 rounded p-4 mb-6">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
        <span class="text-orange-800">{{ progressEmails }}</span>
      </div>
    </div>

    <div v-if="isCompleteEmails" class="bg-green-50 border border-green-200 rounded p-4 mb-6">
      <span class="text-green-800 font-semibold">{{ progressEmails }}</span>
    </div>

    <div v-if="errorEmails" class="bg-red-50 border border-red-200 rounded p-4 mb-6">
      <span class="text-red-800">{{ errorEmails }}</span>
    </div>
  </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { migrateBranchFields } from '@/migration-branch.js'
import { useFirestore } from 'vuefire'
import { collection, getDocs, query, where, updateDoc, doc, arrayRemove, getDoc } from 'firebase/firestore'
import { sendJuniorCounselorTrainingRequest } from '@/stores/datadb'
import { useGeneralStore } from '@/stores/general'
import { storeToRefs } from 'pinia'
import { buildPersonnelRow, downloadCsv, todayStr, slugify } from '@/utils/personnelExport'

const db = useFirestore()

const store = useGeneralStore()
const { loginCorporation, loginCorporationId } = storeToRefs(store)

const isRunning = ref(false)
const isComplete = ref(false)
const progress = ref('')
const results = ref('')
const error = ref('')

// ---- Migration: Reset JC training request flags ----
const isRunningResetJC = ref(false)
const isCompleteResetJC = ref(false)
const progressResetJC = ref('')
const errorResetJC = ref('')

const runResetJC = async () => {
  try {
    isRunningResetJC.value = true
    isCompleteResetJC.value = false
    errorResetJC.value = ''
    progressResetJC.value = 'Querying active Junior Counselors...'

    const q = query(
      collection(db, 'UsersCorporations'),
      where('Function', '==', 'Junior Counselor'),
      where('Active', '==', true)
    )
    const snapshot = await getDocs(q)

    let reset = 0
    let checked = 0
    for (const d of snapshot.docs) {
      checked++
      progressResetJC.value = `Resetting record ${checked} of ${snapshot.size}...`
      const uc = d.data()
      await updateDoc(doc(db, 'Users', uc.UserId), { PraesidiumTrainingRequested: false })
      reset++
    }

    isRunningResetJC.value = false
    isCompleteResetJC.value = true
    progressResetJC.value = `Done. Reset ${reset} records. Now run "Send Training Requests".`
  } catch (err) {
    isRunningResetJC.value = false
    errorResetJC.value = err.message || 'An error occurred'
  }
}
// --------------------------------------------------------------------

// ---- Migration: Send training request for existing Junior Counselors ----
const isRunningJC = ref(false)
const isCompleteJC = ref(false)
const progressJC = ref('')
const errorJC = ref('')

const runJCMigration = async () => {
  try {
    isRunningJC.value = true
    isCompleteJC.value = false
    errorJC.value = ''
    progressJC.value = 'Querying active Junior Counselors...'

    const q = query(
      collection(db, 'UsersCorporations'),
      where('Function', '==', 'Junior Counselor'),
      where('Active', '==', true)
    )
    const snapshot = await getDocs(q)

    let sent = 0
    let skipped = 0
    let checked = 0
    for (const d of snapshot.docs) {
      checked++
      progressJC.value = `Checking record ${checked} of ${snapshot.size}...`
      const uc = d.data()
      const userDoc = await getDoc(doc(db, 'Users', uc.UserId))
      if (!userDoc.exists()) { skipped++; continue }
      const userData = userDoc.data()
      if (userData.PraesidiumTrainingRequested) { skipped++; continue }

      const corpDoc = await getDoc(doc(db, 'Corporations', uc.CorporationId))
      const branch = corpDoc.exists() ? corpDoc.data().Branch : null

      await sendJuniorCounselorTrainingRequest(uc.UserId, userData, uc.CorporationName, branch)
      sent++
      await new Promise((resolve) => setTimeout(resolve, 5000))
    }

    isRunningJC.value = false
    isCompleteJC.value = true
    progressJC.value = `Done. Sent ${sent} emails, skipped ${skipped} already processed.`
  } catch (err) {
    isRunningJC.value = false
    errorJC.value = err.message || 'An error occurred'
  }
}
// --------------------------------------------------------------------

// ---- Cleanup: Remove stale 'No Active' from reactivated users ----
const isRunningCleanup = ref(false)
const isCompleteCleanup = ref(false)
const progressCleanup = ref('')
const errorCleanup = ref('')

const runCleanup = async () => {
  try {
    isRunningCleanup.value = true
    isCompleteCleanup.value = false
    errorCleanup.value = ''
    progressCleanup.value = 'Querying active UsersCorporations...'

    const q = query(collection(db, 'UsersCorporations'), where('Active', '==', true))
    const snapshot = await getDocs(q)

    let fixed = 0
    let checked = 0
    for (const d of snapshot.docs) {
      checked++
      const reasons = d.data().StatusRquiringAttentionReasons || []
      if (reasons.includes('No Active')) {
        progressCleanup.value = `Fixing record ${checked} of ${snapshot.size}...`
        await updateDoc(doc(db, 'UsersCorporations', d.id), {
          StatusRquiringAttentionReasons: arrayRemove('No Active')
        })
        fixed++
      }
    }

    isRunningCleanup.value = false
    isCompleteCleanup.value = true
    progressCleanup.value = ''
    errorCleanup.value = ''
    // reuse results ref scoped to this section via a local display
    progressCleanup.value = `Done. Fixed ${fixed} of ${snapshot.size} records checked.`
  } catch (err) {
    isRunningCleanup.value = false
    errorCleanup.value = err.message || 'An error occurred'
  }
}
// ------------------------------------------------------------------

// ---- Export personnel to CSV ----

// Batch fetch Users by id in chunks of 30 (Firestore 'in' query limit).
const fetchUsersByIds = async (userIds) => {
  const usersMap = {}
  for (let i = 0; i < userIds.length; i += 30) {
    const chunk = userIds.slice(i, i + 30)
    const usersSnap = await getDocs(query(collection(db, 'Users'), where('__name__', 'in', chunk)))
    usersSnap.docs.forEach((d) => { usersMap[d.id] = d.data() })
  }
  return usersMap
}

// ---- Export all personnel across all corporations ----
const isDownloadingAll = ref(false)
const errorDownloadAll = ref('')

const downloadAllPersonnel = async () => {
  isDownloadingAll.value = true
  errorDownloadAll.value = ''
  try {
    const snapshot = await getDocs(collection(db, 'UsersCorporations'))
    const userCorps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

    const userIds = [...new Set(userCorps.map((uc) => uc.UserId))]
    const usersMap = await fetchUsersByIds(userIds)

    const rows = []
    for (const uc of userCorps) {
      const user = usersMap[uc.UserId]
      if (!user) continue
      rows.push(buildPersonnelRow(uc, user, true))
    }
    rows.sort(
      (a, b) => a.Corporation.localeCompare(b.Corporation) || a.Last.localeCompare(b.Last)
    )

    downloadCsv(rows, `all-personnel-${todayStr()}.csv`)
  } catch (err) {
    errorDownloadAll.value = err.message || 'An error occurred'
  }
  isDownloadingAll.value = false
}

// ---- Export personnel for the logged-in corporation ----
const isDownloadingCorp = ref(false)
const errorDownloadCorp = ref('')

const downloadCorpPersonnel = async () => {
  isDownloadingCorp.value = true
  errorDownloadCorp.value = ''
  try {
    const corpId = loginCorporationId.value
    const snapshot = await getDocs(
      query(collection(db, 'UsersCorporations'), where('CorporationId', '==', corpId))
    )
    const userCorps = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }))

    const userIds = [...new Set(userCorps.map((uc) => uc.UserId))]
    const usersMap = await fetchUsersByIds(userIds)

    const rows = []
    for (const uc of userCorps) {
      const user = usersMap[uc.UserId]
      if (!user) continue
      rows.push(buildPersonnelRow(uc, user, false))
    }
    rows.sort((a, b) => a.Last.localeCompare(b.Last))

    downloadCsv(rows, `${slugify(loginCorporation.value?.Name)}-personnel-${todayStr()}.csv`)
  } catch (err) {
    errorDownloadCorp.value = err.message || 'An error occurred'
  }
  isDownloadingCorp.value = false
}
// ------------------------------------------------------------------

// ---- Cleanup: Normalize Users email to lowercase ----
const isRunningEmails = ref(false)
const isCompleteEmails = ref(false)
const progressEmails = ref('')
const errorEmails = ref('')
const emailScanned = ref(false)
const emailChanges = ref([])

const scanEmails = async () => {
  try {
    isRunningEmails.value = true
    isCompleteEmails.value = false
    errorEmails.value = ''
    emailScanned.value = false
    emailChanges.value = []
    progressEmails.value = 'Scanning Users...'

    const snapshot = await getDocs(collection(db, 'Users'))
    const changes = []
    snapshot.docs.forEach((d) => {
      const email = d.data().Email
      if (typeof email !== 'string' || email === '') return
      const normalized = email.trim().toLowerCase()
      if (normalized !== email) {
        changes.push({ id: d.id, from: email, to: normalized })
      }
    })

    emailChanges.value = changes
    emailScanned.value = true
    isRunningEmails.value = false
    progressEmails.value = ''
  } catch (err) {
    isRunningEmails.value = false
    errorEmails.value = err.message || 'An error occurred'
  }
}

const applyEmails = async () => {
  try {
    isRunningEmails.value = true
    isCompleteEmails.value = false
    errorEmails.value = ''

    const changes = emailChanges.value
    let updated = 0
    for (const c of changes) {
      progressEmails.value = `Updating record ${updated + 1} of ${changes.length}...`
      await updateDoc(doc(db, 'Users', c.id), { Email: c.to })
      updated++
    }

    emailChanges.value = []
    emailScanned.value = false
    isRunningEmails.value = false
    isCompleteEmails.value = true
    progressEmails.value = `Done. Normalized ${updated} email(s).`
  } catch (err) {
    isRunningEmails.value = false
    errorEmails.value = err.message || 'An error occurred'
  }
}
// ------------------------------------------------------------------

const runMigration = async () => {
  try {
    isRunning.value = true
    isComplete.value = false
    error.value = ''
    progress.value = 'Starting migration...'
    results.value = ''

    // Override console.log to capture progress
    const originalLog = console.log
    console.log = (message) => {
      progress.value = message
      originalLog(message)
    }

    await migrateBranchFields()

    isRunning.value = false
    isComplete.value = true
    results.value = 'All existing records have been successfully updated with Branch fields.'
    progress.value = ''

    // Restore console.log
    console.log = originalLog

  } catch (err) {
    isRunning.value = false
    error.value = err.message || 'An error occurred during migration'
    console.error('Migration error:', err)
  }
}
</script>