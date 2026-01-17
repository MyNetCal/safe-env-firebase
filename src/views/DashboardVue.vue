<script setup>
import dayjs from 'dayjs'
import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  query,
  where,
  updateDoc,
  orderBy,
  and,
  or
} from 'firebase/firestore'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { ref, onUnmounted, computed, watch } from 'vue'
import { useGeneralStore } from '@/stores/general'
import {
  Dialog,
  DialogPanel,
  DialogTitle,
  Disclosure,
  DisclosureButton,
  DisclosurePanel
} from '@headlessui/vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getEmailsAllSEC, getEmailSECPrelature, initUser } from '@/stores/datadb'
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import { useBackgroundCheck } from '@/composables/backgroundCheck'
import { useFuse } from '@vueuse/integrations/useFuse'

const db = useFirestore()
const store = useGeneralStore()
const storage = useFirebaseStorage()
const backgroundCheck = useBackgroundCheck()

const { openFileDiologAndUpload } = backgroundCheck

dayjs.extend(LocalizedFormat)

const needBackgroundRequest = ref([])

let unsubNeedBackgroundRequest = null

let unsubPersonnel = null

const includeRequested = ref(true)

const personnel = ref([])
let unsubUsers = {}

const personnelFilter = computed(() => {
  return personnel.value.filter((p) => p.userHasAllScreening)
})

const totalPeopleNeedingBackground = computed(() => {
  return needBackgroundRequest.value.length
})

let inputFilterNames = ref('')
let filterNeedBackground = ref([])

function filterNames() {
  const { results: filterNames } = useFuse(inputFilterNames, needBackgroundRequest.value, {
    fuseOptions: {
      keys: ['Name', 'Nickname', 'LastName'],
      threshold: 0.3,
      ignoreLocation: true
    },
    matchAllWhenSearchEmpty: true
  })
  filterNeedBackground.value = filterNames.value.map((r) => r.item)
}

watch(inputFilterNames, () => {
  filterNames()
  // personnelOrder.value = newVal.map((r) => r.item)
})

const totalPersonnelPending = computed(() => {
  return personnelFilter.value.length
})
getPersonnel()

async function getPersonnel() {
  personnel.value = []

  let q = null

  q = query(
    collection(db, 'UsersCorporations'),
    where('Status', '==', store.USER_STATUS_PENDING),
    where('Entity', '==', 'Prelature')
  )

  unsubscribeAll()
  unsubUsers = {}

  unsubPersonnel = onSnapshot(q, (res) => {
    res.docChanges().forEach(async (change) => {
      const { newIndex, oldIndex, doc: tDoc } = change
      const t = tDoc.data()
      t.id = tDoc.id
      t.UserData = initUser({})
      if (['added', 'modified'].includes(change.type)) {
        const userRef = await getDoc(doc(db, 'Users', t.UserId))
        t.UserData = userRef.data()

        // Skip if user is not in current branch
        if (t.UserData?.Branch !== store.currentBranch) {
          return
        }
      }

      const corpRef = await getDoc(doc(db, 'Corporations', t.CorporationId))
      t.CorpName = corpRef.data().Name
      t.CorpShort = corpRef.data().Short
      t.Screening = corpRef.data().Screening
      t.userHasAllScreening = userHasAllScreening(t)

      if (change.type === 'added') {
        // Add Listner
        unsubUsers[t.id] = onSnapshot(doc(db, 'Users', t.UserId), (res) => {
          const index = personnel.value.findIndex((el) => el.id == t.id)
          personnel.value[index].UserData = res.data()
        })
        personnel.value.splice(newIndex, 0, t)
      }

      if (change.type === 'modified') {
        personnel.value.splice(oldIndex, 1)
        personnel.value.splice(newIndex, 0, t)

        // Add Listner
      }

      if (change.type === 'removed') {
        personnel.value.splice(oldIndex, 1)
        unsubUsers[t.id]()
      }
    })
  })
}

function unsubscribeAll() {
  if (unsubPersonnel) {
    unsubPersonnel()
    Object.values(unsubUsers).forEach((u) => {
      u()
    })
  }
}

function getScreeningReqType(type, screening) {
  const a = []
  store.SCREENING_REQ.forEach((req) => {
    if (screening?.[type][req]) {
      a.push(req)
    }
  })
  return a
}

function userHasAllScreening(user) {
  const typeScreening = store.getScreening(user.Function) // SCREENING_STAFF || SCREENING_JUNIOR_COUNSELOR || SCREENING_LOW_ACCESS
  const req = getScreeningReqType(typeScreening, user.Screening)
  let b = true
  req.forEach((item) => {
    b = b && user[`ScreeningReqFlag${item}`]
  })
  return b
}

function getBackgroundChecksNeedRequest() {
  if (unsubNeedBackgroundRequest) {
    unsubNeedBackgroundRequest()
  }
  const q = query(
    collection(db, 'UsersCorporations'),
    and(
      or(
        and(
          where('BackgroundCheckExpiresOn', '<=', dayjs().add(30, 'days').format('YYYY-MM-DD')),
          where('BackgroundCheckExpiresOn', '>=', dayjs().format('YYYY-MM-DD'))
        ),
        where('BackgroundCheckExpiresOn', '==', '')
      ),

      where('Active', '==', true)
    )
  )
  needBackgroundRequest.value = {}
  const userCorps = []
  unsubNeedBackgroundRequest = onSnapshot(q, async (res) => {
    console.log('Background Check Requested', res.size)

    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: userDoc } = change
      const userCorp = userDoc.data()
      userCorp.id = userDoc.id

      // user added to the list
      if (change.type === 'added') {
        userCorps.splice(newIndex, 0, userCorp)
      }
      // user info changed
      if (change.type === 'modified') {
        userCorps.splice(oldIndex, 1)
        userCorps.splice(newIndex, 0, userCorp)
      }
      // user removed
      if (change.type === 'removed') {
        userCorps.splice(oldIndex, 1)
      }
    })
    needBackgroundRequest.value = []
    // Collect all fetch promises
    const fetchPromises = userCorps.map(async (userCorp) => {
      const [userSnap, corpSnap] = await Promise.all([
        getDoc(doc(db, 'Users', userCorp.UserId)),
        getDoc(doc(db, 'Corporations', userCorp.CorporationId))
      ])
      const user = userSnap.data()
      const corp = corpSnap.data()
      userCorp.CorpInfo = corp

      // Skip if user is not in current branch
      if (user?.Branch !== store.currentBranch) {
        console.log('Skipping: ', user)

        return null
      }

      if (!user.ScreeningBackgroundCheckRequested) return null
      return {
        id: user.id,
        Name: user?.Name,
        LastName: user?.LastName,
        Nickname: user?.Nickname,
        Email: user?.Email,
        Country: user?.Country,
        ExpiresOn: userCorp.BackgroundCheckExpiresOn,
        ScreeningBackgroundCheckRenewalRequested: user.ScreeningBackgroundCheckRenewalRequested,
        ScreeningBackgroundCheckRequested: user.ScreeningBackgroundCheckRequested,
        Corps: [userCorp]
      }
    })
    // Wait for all fetches to complete
    const results = await Promise.all(fetchPromises)
    // Build the final array
    results.forEach((userData) => {
      if (userData) {
        const existingIndex = needBackgroundRequest.value.findIndex((u) => u.id === userData.id)
        if (existingIndex >= 0) {
          needBackgroundRequest.value[existingIndex].Corps.push(userData.Corps[0])
        } else {
          needBackgroundRequest.value.push(userData)
        }
      }
    })
    filterNeedBackground.value = needBackgroundRequest.value
  })
}

getBackgroundChecksNeedRequest()

async function backgroundRequested(user) {
  if (user.ScreeningBackgroundCheckRenewalRequested) {
    await updateDoc(doc(db, 'Users', user.id), {
      ScreeningBackgroundCheckRenewalRequested: false
    })
    getBackgroundChecksNeedRequest()
    return
  }
  const allSECEmails = await getEmailsAllSEC()
  const emailSECPrelature = await getEmailSECPrelature(store.currentBranch)
  const files = user.ScreeningReqFilesBackground && user.ScreeningReqFilesBackground.length > 0
  const templateSEC = files
    ? 'Background-Check-Renewal-AllSEC-Notification'
    : 'Background-Check-New-AllSEC-Notification'
  const templateGuy = files
    ? 'Background-Check-Renewal-Instructions'
    : 'Background-Check-New-Instructions'
  const data = {
    Nickname: user.Nickname,
    ExpirationDate: dayjs(user.ExpiresOn).format('MMMM D, YYYY'),
    userCorps: []
  }

  for (let index = 0; index < user.Corps.length; index++) {
    const userCorp = user.Corps[index]
    const emailSEC = allSECEmails[userCorp.CorpInfo.id]
    if (!emailSEC) {
      console.log('No email for ', userCorp.CorpInfo.id)
      continue
    }
    const corp = {
      Name: userCorp.CorpInfo?.Name,
      Short: userCorp.CorpInfo.Short,
      Email: emailSEC
    }
    data.userCorps.push(corp)
    store.createDocTriggerEmailTemplate(
      templateSEC,
      {
        Nickname: user.Nickname,
        Name: user?.Name,
        LastName: user?.LastName,
        ExpirationDate: dayjs(user.ScreeningBackgroundDate).add(2, 'y').format('MMMM D, YYYY'),
        EmailSECPrelature: emailSECPrelature
      },
      emailSEC
    )
  }
  store.createDocTriggerEmailTemplate(templateGuy, data, user.Email)
  await updateDoc(doc(db, 'Users', user.id), {
    ScreeningBackgroundCheckRenewalRequested: true
  })
  getBackgroundChecksNeedRequest()
}

const reportsList = ref([])
let unsubReportsList = null

onUnmounted(() => {
  if (unsubReportsList) {
    unsubReportsList()
  }
  if (unsubNeedBackgroundRequest) {
    unsubNeedBackgroundRequest()
  }
  if (unsubPersonnel) {
    unsubPersonnel()
  }
})

function getReportsList() {
  reportsList.value = []
  let q = null
  q = query(collection(db, 'IncidentReports'), orderBy('DateFiled', 'desc'))

  if (unsubReportsList) {
    unsubReportsList()
  }

  unsubReportsList = onSnapshot(q, (res) => {
    res.docChanges().forEach(async (change) => {
      const { newIndex, oldIndex, doc: tDoc } = change
      const t = tDoc.data()
      t.id = tDoc.id

      const corpRef = await getDoc(doc(db, 'Corporations', t.CorporationId))
      t.CorpData = corpRef.data()
      const userRef = await getDoc(doc(db, 'Users', t.UserId))
      t.UserData = userRef.data()

      if (change.type === 'added') {
        reportsList.value.splice(newIndex, 0, t)
      }
      if (change.type === 'modified') {
        reportsList.value.splice(oldIndex, 1)
        reportsList.value.splice(newIndex, 0, t)
      }
      if (change.type === 'removed') {
        reportsList.value.splice(oldIndex, 1)
      }
    })
  })
}

getReportsList()

function getUrlReport(path) {
  getDownloadURL(storageRef(storage, `gs://vue-safe-env-pdfs/${path}`)).then((url) => {
    window.open(url, '_blank')
  })
}

const inputDateBackground = ref(false)
const dateBackground = ref(dayjs().format('YYYY-MM-DD'))
const useBackgroundCheckId = ref('')
function onLoadBackgroundCheck(id) {
  useBackgroundCheckId.value = id
  inputDateBackground.value = true
}

function onChooseFile() {
  console.log('Choose File')
  inputDateBackground.value = false
  openFileDiologAndUpload(useBackgroundCheckId.value, dateBackground.value)
}
</script>

<template>
  <div
    class="content-height thinsb h-full justify-between overflow-auto overflow-y-scroll p-2 text-slate-700"
  >
    <h1>Dashboard</h1>

    <!-- People requiring Background Check Renewal -->

    <div class="mx-auto mt-5 flex max-w-4xl flex-wrap gap-3">
      <div class="flex-grow">
        <!-- Title -->
        <div class="rounded-t bg-slate-700 px-5 py-3 text-white">
          <div>Background Check needed ({{ totalPeopleNeedingBackground }})</div>

          <div
            class="mt-2 cursor-pointer rounded p-1 text-sm hover:bg-slate-600"
            @click.prevent="includeRequested = !includeRequested"
          >
            Including already requested:
            <FontAwesomeIcon
              class="ml-3"
              size="xl"
              :icon="includeRequested ? ['far', 'check-square'] : ['far', 'square']"
            />
          </div>
        </div>

        <div class="mx-auto mt-3 w-60">
          <MyInputText v-model="inputFilterNames" clear placeholder="Search name" />
        </div>

        <!-- body -->
        <div class="flex flex-wrap gap-x-3 text-left text-slate-700">
          <template v-for="user in filterNeedBackground" :key="user.id">
            <div
              v-if="includeRequested || !user.ScreeningBackgroundCheckRenewalRequested"
              class="w-60 flex-grow"
            >
              <Disclosure v-slot="{ open }">
                <div class="my-2 rounded shadow">
                  <div>
                    <div class="bg-slate-200 px-2 py-2">
                      <!-- Name and Date -->
                      <div class="flex place-items-center justify-between">
                        <div>
                          <div class="pr-5 font-semibold">
                            {{ user?.Name }} {{ user?.LastName }}
                          </div>
                          <div v-if="user.ExpiresOn">
                            Background check expires on
                            <div class="font-semibold">
                              {{ dayjs(user.ExpiresOn).format('MMM D, YYYY') }}
                            </div>
                          </div>
                          <div v-else>
                            {{ user.ScreeningBackgroundCheckRequested }}
                          </div>
                        </div>

                        <DisclosureButton>
                          <div class="p-2">
                            <FontAwesomeIcon
                              size="xl"
                              icon="fa-caret-down"
                              :class="open ? '' : '-rotate-90 transform'"
                            />
                          </div>
                        </DisclosureButton>
                      </div>

                      <div
                        class="mt-2 cursor-pointer rounded py-1 text-sm hover:bg-slate-300"
                        @click.prevent="backgroundRequested(user)"
                      >
                        Requested:
                        <FontAwesomeIcon
                          class="ml-3"
                          size="xl"
                          :icon="
                            user.ScreeningBackgroundCheckRenewalRequested
                              ? ['far', 'check-square']
                              : ['far', 'square']
                          "
                        />
                      </div>

                      <!-- Button Upload -->
                      <div
                        v-if="user.ScreeningBackgroundCheckRenewalRequested"
                        class="mx-auto mt-3 w-fit"
                      >
                        <MyButton @click="onLoadBackgroundCheck(user.id)"
                          >Upload Background</MyButton
                        >
                      </div>
                    </div>
                  </div>
                  <Transition
                    enter-active-class="transition duration-100 ease-out"
                    enter-from-class="transform scale-95 opacity-0"
                    enter-to-class="transform scale-100 opacity-100"
                    leave-active-class="transition duration-75 ease-out"
                    leave-from-class="transform scale-100 opacity-100"
                    leave-to-class="transform scale-95 opacity-0"
                  >
                    <DisclosurePanel>
                      <!-- gray title -->
                      <div class="thinsb max-h-60 overflow-auto">
                        <!-- Email -->
                        <div class="mt-2">
                          <div>Email: {{ user.Email }}</div>
                          <div>Country: {{ user.Country }}</div>
                        </div>
                        <div v-for="userCorp in user.Corps" :key="userCorp.id">
                          <div class="ml-3">&bull; {{ userCorp.CorpInfo?.Short }}</div>
                        </div>
                      </div>
                    </DisclosurePanel>
                  </Transition>
                </div>
              </Disclosure>
            </div>
          </template>
        </div>
      </div>

      <!-- Users -->
      <div class="flex-grow">
        <div class="rounded-t bg-slate-700 px-5 py-3 text-white">
          <div>Personnel pending approval ({{ totalPersonnelPending }})</div>
        </div>
        <div class="flex flex-wrap gap-3 text-left text-slate-700">
          <div
            v-for="p in personnelFilter"
            :key="p.id"
            class="w-60 flex-grow rounded bg-slate-200 px-2 py-2"
          >
            <div>{{ p.UserData.Nickname }} {{ p.UserData.LastName }}</div>
            <div>{{ p.CorporationName }}</div>
            <div>Total votes: {{ p.ApprovedBy.length }}</div>
          </div>
        </div>
      </div>
    </div>

    <!-- List of reports -->
    <div class="mt-10">
      <div>List of Reports</div>
      <table v-if="reportsList.length > 0" class="mx-auto mt-3">
        <thead>
          <tr>
            <th>Date</th>
            <th>Corporation</th>
            <th>By</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in reportsList"
            :key="r.id"
            @click="getUrlReport(r.Filepath)"
            class="cursor-pointer hover:bg-slate-200"
          >
            <td class="p-1">{{ dayjs(r.DateFiled).format('LL') }}</td>
            <td>{{ r.CorpData.Short }}</td>
            <td class="p-1">{{ r.UserData?.Name }} {{ r.UserData?.LastName }}</td>
          </tr>
        </tbody>
      </table>
      <div v-else class="mt-4 text-center text-slate-500">No reports yet</div>
    </div>
  </div>

  <Dialog :open="inputDateBackground" @close="inputDateBackground = false" class="relative z-50">
    <DialogPanel class="my-dialog">
      <div class="my-dialog-overlay" />
      <div class="my-dialog-outer">
        <div class="my-dialog-inner">
          <DialogTitle class="my-dialog-title">
            Background Check Date
            <FontAwesomeIcon @click="inputDateBackground = false" class="" icon="times" />
          </DialogTitle>
          <div class="my-dialog-content">
            <MyInputText
              label="Date"
              type-input="date"
              class="mx-auto w-fit"
              v-model="dateBackground"
            />
          </div>
          <div class="my-dialog-buttons">
            <MyButton @click="inputDateBackground = false">Close</MyButton>
            <MyButton @click="onChooseFile">Choose File</MyButton>
          </div>
        </div>
      </div>
    </DialogPanel>
  </Dialog>
</template>

<style scoped>
.content-height {
  max-height: calc(100vh - 80px);
}
</style>
