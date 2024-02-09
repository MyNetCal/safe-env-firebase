<script setup>
import dayjs from 'dayjs'
import { collection, doc, getDoc, getDocs, onSnapshot, query, where, updateDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { ref, onUnmounted } from 'vue'
import { useGeneralStore } from '@/stores/general'
import { Disclosure, DisclosureButton, DisclosurePanel } from '@headlessui/vue'
import MyButton from '@/components/MyButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { getEmailsAllSEC, getEmailSECPrelature } from '@/stores/datadb'

const db = useFirestore()
const store = useGeneralStore()

const needBackgroundRequest = ref([])

let unsubNeedBackgroundRequest = null

onUnmounted(() => {
  if (unsubNeedBackgroundRequest) {
    unsubNeedBackgroundRequest()
  }
})

async function testEmail() {
  const allUsers = []

  // Get all users need renew
  const q = query(
    collection(db, 'Users'),
    where('ScreeningBackgroundDate', 'in', [
      dayjs().subtract(2, 'years').add(30, 'days').format('YYYY-MM-DD'),
      dayjs().subtract(2, 'years').add(20, 'days').format('YYYY-MM-DD'),
      dayjs().subtract(2, 'years').add(10, 'days').format('YYYY-MM-DD')
    ]),
    where('ScreeningBackgroundCheckRenewalRequested', '==', false),
    where('CorpsActiveAtLeastOne', '==', true)
  )
  const users = await getDocs(q)

  users.forEach((userData) => {
    const u = userData.data()

    allUsers.push({
      id: u.id,
      Name: u.Name,
      LastName: u.LastName,
      Nickname: u.Nickname,
      Email: u.Email,
      ScreeningBackgroundDate: u.ScreeningBackgroundDate,
      ExpiresOn: dayjs(u.ScreeningBackgroundDate).add(2, 'years').format('MMMM D, YYYY')
    })
  })

  //get all usercoprorotions per user
  for (let index = 0; index < allUsers.length; index++) {
    const user = allUsers[index]
    user.userCorps = []
    const userCorps = await getDocs(
      query(
        collection(db, 'UsersCorporations'),
        where('UserId', '==', user.id),
        where('Active', '==', true)
      )
    )
    userCorps.forEach((userCorp) => {
      const uc = userCorp.data()
      user.userCorps.push({
        id: userCorp.id,
        Activity: store.activities[uc.Activity].Name,
        Board: uc.Board ? 'Yes' : 'No',
        Entity: uc.Entity,
        Function: uc.Function,
        Role: uc.Role,
        Screening: uc.Screening ? 'Yes' : 'No',
        CorporationId: uc.CorporationId
      })
    })
    for (let index = 0; index < user.userCorps.length; index++) {
      const userCorp = user.userCorps[index]
      const corp = await getDoc(doc(db, 'Corporations', userCorp.CorporationId))
      userCorp.Name = corp.data().Name
      userCorp.Short = corp.data().Short
    }
    console.log('User: ', user)
  }
}

function getBackgroundChecksNeedRequest() {
  const q = query(
    collection(db, 'Users'),
    where(
      'ScreeningBackgroundDate',
      '<=',
      dayjs().subtract(2, 'years').add(30, 'days').format('YYYY-MM-DD')
    ),
    where('ScreeningBackgroundDate', '>=', dayjs().subtract(2, 'years').format('YYYY-MM-DD')),
    where('ScreeningBackgroundCheckRenewalRequested', '==', false),
    where('CorpsActiveAtLeastOne', '==', true)
  )
  needBackgroundRequest.value = []
  unsubNeedBackgroundRequest = onSnapshot(q, (res) => {
    res.docChanges().forEach((change) => {
      const { newIndex, oldIndex, doc: userDoc } = change
      const user = userDoc.data()

      // get userCorp and corp info
      if (change.type === 'added' || change.type === 'modified') {
        getDocs(
          query(
            collection(db, 'UsersCorporations'),
            where('UserId', '==', user.id),
            where('Active', '==', true)
          )
        ).then((snapshot) => {
          user.Corps = []
          snapshot.forEach((d) => {
            const userCorp = d.data()

            getDoc(doc(db, 'Corporations', userCorp.CorporationId)).then((c) => {
              userCorp.CorpInfo = c.data()
              needBackgroundRequest.value[newIndex].Corps.push(userCorp)
            })
          })
        })
      }

      // user added to the list
      if (change.type === 'added') {
        needBackgroundRequest.value.splice(newIndex, 0, user)
      }
      // user info changed
      if (change.type === 'modified') {
        needBackgroundRequest.value.splice(oldIndex, 1)
        needBackgroundRequest.value.splice(newIndex, 0, user)
      }
      // user removed
      if (change.type === 'removed') {
        needBackgroundRequest.value.splice(oldIndex, 1)
      }
    })
  })
}

getBackgroundChecksNeedRequest()

async function backgroundRequested(user) {
  console.log(user)
  const allSECEmails = await getEmailsAllSEC()
  const emailSECPrelature =  await getEmailSECPrelature()
  const data = {
    Nickname: user.Nickname,
    ExpirationDate: dayjs(user.ScreeningBackgroundDate).add(2, 'y').format('MMMM D, YYYY'),
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
      Name: userCorp.CorpInfo.Name,
      Short: userCorp.CorpInfo.Short,
      Email: emailSEC
    }
    data.userCorps.push(corp)
    store.triggerEmailTemplate(
      'Background-Check-Renewal-AllSEC-Notification',
      {
        Nickname: user.Nickname,
        Name: user.Name,
        LastName: user.LastName,
        ExpirationDate: dayjs(user.ScreeningBackgroundDate).add(2, 'y').format('MMMM D, YYYY'),
        EmailSECPrelature: emailSECPrelature
      },
      emailSEC
    )
  }
  console.log('data: ', data)
  store.triggerEmailTemplate('Background-Check-Renewal-Instructions', data, user.Email)
  updateDoc(doc(db, 'Users', user.id), {
    ScreeningBackgroundCheckRenewalRequested: true
  })
}
</script>

<template>
  <div
    class="content-height thinsb h-full justify-between overflow-auto overflow-y-scroll p-2 text-slate-700"
  >
    <h1 @click="testEmail">Dashboard</h1>

    <!-- People requiring Background Check Renewal -->
    <div class="mx-auto mt-5 w-fit">
      <!-- Title -->
      <div class="rounded-t bg-slate-700 px-5 py-3 text-white">
        <div>Background Check about to Expire</div>
      </div>
      <!-- body -->
      <div class="text-left">
        <div v-for="user in needBackgroundRequest" :key="user.id">
          <Disclosure>
            <div class="my-2 rounded shadow">
              <DisclosureButton>
                <div class="bg-slate-200 px-2 py-2">
                  <!-- Name and Date -->
                  <div class="flex place-items-center justify-between">
                    <div class="pr-5 font-semibold">{{ user.Nickname }} {{ user.LastName }}</div>
                    <div>
                      Expires on
                      <div class="font-semibold">
                        {{ dayjs(user.ScreeningBackgroundDate).add(1, 'y').format('MMM D, YYYY') }}
                      </div>
                    </div>
                  </div>

                  <!-- Email -->
                  <div class="mt-2 flex justify-between">
                    <div>Email: {{ user.Email }}</div>
                    <FontAwesomeIcon icon="fa-caret-down" />
                  </div>

                  <div class="mt-2">
                    <MyButton @click.prevent="backgroundRequested(user)" class="bg-stone-600"
                      >Background Check has been Requested</MyButton
                    >
                  </div>
                </div>
              </DisclosureButton>
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
  </div>
</template>

<style scoped>
.content-height {
  max-height: calc(100vh - 80px);
}
</style>
