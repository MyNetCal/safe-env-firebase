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
import { ref, onUnmounted } from 'vue'
import { useGeneralStore } from '@/stores/general'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getEmailsAllSEC, getEmailSECPrelature } from '@/stores/datadb'
import { ref as storageRef, getDownloadURL } from 'firebase/storage'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'

const db = useFirestore()
const store = useGeneralStore()
const storage = useFirebaseStorage()

dayjs.extend(LocalizedFormat)

const needBackgroundRequest = ref([])

let unsubNeedBackgroundRequest = null

const includeRequested = ref(true)

onUnmounted(() => {
  if (unsubNeedBackgroundRequest) {
    unsubNeedBackgroundRequest()
  }
})

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
    needBackgroundRequest.value = {}
    for (let index = 0; index < userCorps.length; index++) {
      const userCorp = userCorps[index]
      const userRef = await getDoc(doc(db, 'Users', userCorp.UserId))
      const corpRef = await getDoc(doc(db, 'Corporations', userCorp.CorporationId))
      const user = userRef.data()
      const corp = corpRef.data()
      userCorp.CorpInfo = corp
      if (!user.ScreeningBackgroundCheckRequested) continue
      needBackgroundRequest.value[user.id] = {
        id: user.id,
        Name: user?.Name,
        LastName: user?.LastName,
        Nickname: user?.Nickname,
        Email: user.Email,
        ExpiresOn: userCorp.BackgroundCheckExpiresOn,
        ScreeningBackgroundCheckRenewalRequested: user.ScreeningBackgroundCheckRenewalRequested,
        ScreeningBackgroundCheckRequested: user.ScreeningBackgroundCheckRequested
      }
      if (!needBackgroundRequest.value[user.id].Corps) {
        needBackgroundRequest.value[user.id].Corps = []
      }
      needBackgroundRequest.value[user.id].Corps.push(userCorp)
      // Updated array
    }
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
  const emailSECPrelature = await getEmailSECPrelature()
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
</script>

<template>
  <div
    class="content-height thinsb h-full justify-between overflow-auto overflow-y-scroll p-2 text-slate-700"
  >
    <h1>Dashboard</h1>

    <!-- People requiring Background Check Renewal -->
    <div class="mx-auto mt-5 w-fit">
      <!-- Title -->
      <div class="rounded-t bg-slate-700 px-5 py-3 text-white">
        <div>Background Check needed</div>

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
      <!-- body -->
      <div class="text-left text-slate-700">
        <div v-for="user in needBackgroundRequest" :key="user.id">
          <Disclosure
            v-slot="{ open }"
            v-if="includeRequested || !user.ScreeningBackgroundCheckRenewalRequested"
          >
            <div class="my-2 rounded shadow">
              <div>
                <div class="bg-slate-200 px-2 py-2">
                  <!-- Name and Date -->
                  <div class="flex place-items-center justify-between">
                    <div>
                      <div class="pr-5 font-semibold">
                        {{ user?.Nickname }} {{ user?.LastName }}
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
                    </div>
                    <div v-for="userCorp in user.Corps" :key="userCorp.id">
                      <div class="ml-3">&bull; {{ userCorp.CorpInfo?.Short }}</div>

                      <div class="ml-10">
                        <div>Activity: {{ store.activities[userCorp.Activity]?.Name }}</div>
                        <div>Role: {{ userCorp?.Role }}</div>

                        <div>Entity: {{ userCorp?.Entity }}</div>
                        <div>
                          Board:
                          {{ userCorp?.Board ? '&check;' : '&#x2715;' }} - Screening:
                          {{ userCorp?.Screening ? '&check;' : '&#x2715;' }}
                        </div>
                      </div>
                    </div>
                  </div>
                </DisclosurePanel>
              </Transition>
            </div>
          </Disclosure>
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
</template>

<style scoped>
.content-height {
  max-height: calc(100vh - 80px);
}
</style>
