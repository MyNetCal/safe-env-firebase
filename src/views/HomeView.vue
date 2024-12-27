<script setup>
/*
Flags for screening:
- ScreeningReqFlagCode [edited after pdf created]
- ScreeningReqFlagConsent [edited by Function]

 */

import { ref as storageRef, getDownloadURL } from '@firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { computed, ref, toRefs, watch } from 'vue'
import { useScroll } from '@vueuse/core'
import MyButton from '@/components/MyButton.vue'
import dayjs from 'dayjs'
import localizedFormat from 'dayjs/plugin/localizedFormat'
import relativeTime from 'dayjs/plugin/relativeTime'
import {
  doc,
  arrayUnion,
  collection,
  addDoc,
  setDoc,
  arrayRemove,
  deleteField,
  updateDoc,
  Timestamp,
  query,
  where,
  getDocs,
  getDoc
} from 'firebase/firestore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import { useGeneralStore } from '@/stores/general'
import UsersViewTrainingList from './Users/UsersViewTrainingList.vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

dayjs.extend(localizedFormat).extend(relativeTime)

const corpId = computed(() => store.loginCorporationId)
const loginUser = computed(() => store.loginUser)
const loginUserCorporation = computed(() => store.loginUserCorporation)


// eslint-disable-next-line no-unused-vars
async function updateDatabase() {
  const querySnapshot = await getDocs(collection(db, 'Users'))
  querySnapshot.forEach((d) => {
    updateDoc(doc(db, 'Users', d.id), {
      Country: 'United States'
    })
  })
}

watch(
  corpId,
  (nv) => {
    if (nv != 'xxx') {
      const a = []
      a.push(loginUserCorporation.value.Function)
      if (loginUserCorporation.value.Board && loginUserCorporation.value.Function != 'Board') {
        a.push('Board')
      }
      if (loginUserCorporation.value.Screening) {
        a.push('Screening')
      }
    }
  },
  { immediate: true }
)

const codeEditing = ref(false)
const consentEditing = ref(false)

const codeText = ref(null)
const consentText = ref(null)

const { arrivedState } = useScroll(codeText)
const { bottom } = toRefs(arrivedState)
const signature = ref('')
const signatureConsent = ref('')

const validCode = computed(() => store.loginUserCorporation?.ScreeningReqFlagCode || false)

const codeExpiring = computed(
  () =>
    dayjs(store.loginUserCorporation?.CodeOfConductExpiresOn)
      .subtract(30, 'days')
      .isBefore(dayjs()) || false
)

const codeExpired = computed(
  () => dayjs(store.loginUserCorporation?.CodeOfConductExpiresOn).isBefore(dayjs()) || false
)

const codeCardText = computed(() => {
  if (validCode.value && codeExpiring.value) {
    return (
      'Your Signed Code of Conduct is expiring on ' +
      dayjs(store.loginUserCorporation.CodeOfConductExpiresOn).format('LL') +
      '. Please re-sign the '
    )
  }
  if (!validCode.value && codeExpired.value) {
    return 'Your signed Code of Conduct expired! Please re-sign the '
  }
  if (!validCode.value && store.loginUserCorporation?.ScreeningReq?.Code?.length > 0) {
    return 'Please read and sign the updated '
  }
  if (!validCode.value) {
    return 'Please read and sign the '
  }
  return null
})

const isConsentRequired = computed(() => {
  const typeScreening = store.getScreening(user.value.Function)
  return store.loginCorporation?.Screening?.[typeScreening]?.Consent
})

const user = computed(() => {
  const userCorp = JSON.parse(JSON.stringify(store.loginUserCorporation))
  userCorp.UserData = JSON.parse(JSON.stringify(store.loginUser))
  return userCorp
})

const validConsent = computed(
  () => store.loginUserCorporation?.ScreeningReqFlagConsent || !isConsentRequired.value
)

const seeSignature = ref(false)

const isCheckBackgroundExpiring = computed(
  () =>
    loginUser.value.ScreeningBackgroundDate &&
    dayjs(loginUser.value.ScreeningBackgroundDate)
      .add(store.loginCorporation?.BackgroundCheckValidFor, 'years')
      .subtract(1, 'M')
      .isBefore(dayjs())
)

async function onCreatingEmailingCode() {
  // Let's close editing pdf dialog
  codeEditing.value = false

  // lets get ref in pdfs
  const pdfRef = doc(collection(db, 'pdfs'))

  // message: Preparing pdf and sending email
  const emailRef = await addDoc(collection(db, `Users/${store.loginUserId}/MessagesPending`), {
    accepted: [],
    error: '',
    message: 'Preparing pdf and sending email',
    rejected: [],
    state: 'PENDING',
    type: 'Email'
  })

  // info needed to send attachment to user and corporation
  const dataEmail = {
    to: [loginUser.value.Email, store.loginCorporation.EmailFiles],
    bcc: [],
    cc: [],
    template: {
      name: 'Code',
      data: {
        Nickname: store.loginUser.Nickname,
        Name: store.loginUser.Name,
        file_link: '',
        corp: store.loginCorporation.Name,
        corpShort: store.loginCorporation.Short,
        secEmail: store.loginCorporation.EmailFiles
      }
    },
    userId: store.loginUserId
  }

  // info needed to generate pdf
  const dataPDFTemplate = {
    Name: signature.value,
    ExpiresAt: Timestamp.fromDate(new Date(dayjs().add(1, 'day').toISOString())),
    code: store.loginCorporation.Code.split('\n'),
    _pdfplum_config: {
      outputFileName: `${store.loginUserId}/${pdfRef.id}.pdf`,
      templatePath: 'vue-safe-env-pdfs/code.zip',
      chromiumPdfOptions: {
        format: 'Letter',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          right: '0.5in',
          left: '0.5in'
        }
      }
    }
  }

  // info needed to update UserCorp
  const dataUserCorp = {
    ScreeningReqFlagCode: true,
    ScreeningCodeDate: dayjs().format('YYYY-MM-DD'),
    CodeOfConductExpiresOn: dayjs()
      .add(store.loginCorporation.CodeOfConductValidFor, 'years')
      .format('YYYY-MM-DD'),
    StatusRquiringAttentionReasons: arrayRemove('Code of Conduct Expired'),
    'ScreeningReq.Code': arrayUnion({
      CodeDate: store.loginCorporation.CodeDate,
      Date: new Date().toISOString(),
      name: 'Code of Conduct.pdf',
      path: `gs://vue-safe-env-pdfs/${store.loginUserId}/${pdfRef.id}.pdf`,
      by: '',
      byName: 'User'
    })
  }

  // all data
  const data = {
    ...dataPDFTemplate,
    dataEmail,
    dataUserCorp,
    emailId: emailRef.id,
    userCorpId: store.loginUserCorporation.id,
    type: 'Code'
  }

  // add doc. The server will be listening
  console.log('data', data)

  setDoc(pdfRef, data)
}

async function onCreatingEmailingConsent() {
  consentEditing.value = false

  // lets get ref in pdfs
  const pdfRef = doc(collection(db, 'pdfs'))

  // message: Preparing pdf and sending email
  const emailRef = await addDoc(collection(db, `Users/${store.loginUserId}/MessagesPending`), {
    accepted: [],
    error: '',
    message: 'Preparing pdf and sending email',
    rejected: [],
    state: 'PENDING',
    type: 'Email'
  })

  // info needed to send attachment to user and corporation
  const dataEmail = {
    to: [loginUser.value.Email, store.loginCorporation.EmailFiles],
    bcc: [],
    cc: [],
    template: {
      name: 'ConsentInfo',
      data: {
        Nickname: store.loginUser.Nickname,
        file_link: '',
        corp: store.loginCorporation.Name,
        corpShort: store.loginCorporation.Short,
        secEmail: store.loginCorporation.EmailFiles
      }
    },
    userId: store.loginUserId
  }

  // info needed to generate pdf
  const dataPDFTemplate = {
    Name: signatureConsent.value,
    Corp: store.loginCorporation.Name,
    Short: store.loginCorporation.Short,
    ExpiresAt: Timestamp.fromDate(new Date(dayjs().add(1, 'day').toISOString())),
    _pdfplum_config: {
      outputFileName: `${store.loginUserId}/${pdfRef.id}.pdf`,
      templatePath: 'vue-safe-env-pdfs/consent.zip',
      chromiumPdfOptions: {
        format: 'Letter',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          right: '0.5in',
          left: '0.5in'
        }
      }
    }
  }

  // info needed to update UserCorp
  const dataUserCorp = {
    ScreeningReqFlagConsent: true,
    ScreeningConsentDate: dayjs().format('YYYY-MM-DD'),
    'ScreeningReq.Consent': arrayUnion({
      Date: new Date().toISOString(),
      name: 'Consent Form.pdf',
      path: `gs://vue-safe-env-pdfs/${store.loginUserId}/${pdfRef.id}.pdf`,
      by: '',
      byName: 'User'
    })
  }

  // all data
  const data = {
    ...dataPDFTemplate,
    dataEmail,
    dataUserCorp,
    emailId: emailRef.id,
    userCorpId: store.loginUserCorporation.id,
    type: 'Consent'
  }

  // add doc. The server will be listening
  console.log('data', data)

  setDoc(pdfRef, data)
}

function showFile(file) {
  getDownloadURL(storageRef(storage, file)).then((url) => {
    window.open(url)
  })
}

// ************************************************
// on Requested Recommendatioins
// ************************************************
const showDialogRecommendation = ref(false)
const recommendationSignature = ref('')
const recommendationMonths = ref(1)
const recommendationYears = ref(1)

const recAccepted = ref() // it contains the info of the user requesting the recommendation. It contains {Name, LastName, CorpName, UserId, CorpId, UserCorpId, PostDate} cf. UserViewScreeningCorpItem.vue

function onToAcceptReq(r) {
  recAccepted.value = r
  showDialogRecommendation.value = true
}

async function saveRecommedationPDF() {
  // lets get ref in pdfs
  const pdfRef = await doc(collection(db, 'pdfs'))

  const dataPDFTemplate = {
    StaffName: recommendationSignature.value,
    CorpName: recAccepted.value.CorpName,
    Name: recAccepted.value.Name,
    LastName: recAccepted.value.LastName,
    Months: recommendationMonths.value,
    Years: recommendationYears.value,
    ExpiresAt: Timestamp.fromDate(new Date(dayjs().add(1, 'day').toISOString())),
    _pdfplum_config: {
      outputFileName: `${recAccepted.value.UserId}/${pdfRef.id}.pdf`,
      templatePath: 'vue-safe-env-pdfs/recommendation.zip',
      chromiumPdfOptions: {
        format: 'Letter',
        margin: {
          top: '0.5in',
          bottom: '0.5in',
          right: '0.5in',
          left: '0.5in'
        }
      }
    }
  }
  setDoc(pdfRef, dataPDFTemplate)
  return pdfRef.id
}

async function onAcceptedRecommendation() {
  // 1. Delete  User asking for recommendation in the UserCorporations Collection

  const userCorporationRef = doc(db, 'UsersCorporations', recAccepted.value.UserCorpId)

  updateDoc(userCorporationRef, {
    ScreenRecommendationStaffRequested: deleteField(),
    ScreeningReqFlagApplication: true
  })

  // 2. Remove entry from array Staff Recommending in the User Collection
  const userRef = doc(db, `Users/${store.loginUserId}`)
  updateDoc(userRef, {
    ScreenRecommendationNewUserRequested: arrayRemove(recAccepted.value)
  })

  // 3. Generate pdf and sve it in the UserCorporations Collection of the User requesting
  const pdfRefId = await saveRecommedationPDF()

  // 4. Add entry in UserCorporation of the user requestion witn the info of the pdf
  // 4.1 Check if the UserId is in UserCorporation with CorporationName = 'Prelature' and Screening = true
  const userCorpRef = collection(db, 'UsersCorporations')
  const q = query(
    userCorpRef,
    where('CorporationName', '==', 'Prelature'),
    where('Screening', '==', true),
    where('UserId', '==', store.loginUserId)
  )
  const userCorpDocs = await getDocs(q)
  let isPrelatureScreeningStaff = false
  if (userCorpDocs.size > 0) {
    isPrelatureScreeningStaff = true
  }

  const user2Ref = doc(db, `Users/${recAccepted.value.UserId}`)
  await updateDoc(user2Ref, {
    ScreeningFilesRecommendation: arrayUnion({
      Date: new Date().toISOString(),
      StaffUserName: store.loginUser.Nickname + ' ' + store.loginUser.LastName,
      StaffUserId: store.loginUserId,
      File: `gs://vue-safe-env-pdfs/${recAccepted.value.UserId}/${pdfRefId}.pdf`,
      IsPrelatureScreeningStaff: isPrelatureScreeningStaff
    })
  })

  showDialogRecommendation.value = false
}

async function onDeclineRecommendation(request) {
  // GEt Email of SEC of the Corporation
  const q = query(
    collection(db, 'UsersCorporations'),
    where('CorporationId', '==', request.CorpId),
    where('SEC', '==', true)
  )
  const querySnapshot = await getDocs(q)
  const userId = querySnapshot.docs[0].data().UserId
  const userSEC = await getDoc(doc(db, `Users/${userId}`))
  const email = userSEC.data().Email

  const corpInfo = await getDoc(doc(db, `Corporations/${request.CorpId}`))
  const userCorpInfo = await getDoc(doc(db, `UsersCorporations/${request.UserCorpId}`))
  const screeningType = store.getScreening(userCorpInfo.data().Function)

  const internalReferences = corpInfo.data().Screening[screeningType].InternalReference
  const externalReferences = corpInfo.data().Screening[screeningType].Reference

  const dataEmail = {
    SECoordinator: userSEC.data().Nickname + ' ' + userSEC.data().LastName,
    ApplicantName: request.Name + ' ' + request.LastName,
    StaffName: store.loginUser.Nickname + ' ' + store.loginUser.LastName,
    InternalReferences: internalReferences,
    ExternalReferences: externalReferences
  }

  store.createDocTriggerEmailTemplate('Screening-Recommendation-Declined', dataEmail, [email])

  updateDoc(doc(db, `Users/${store.loginUserId}`), {
    ScreenRecommendationNewUserRequested: arrayRemove(request)
  })

  const userCorporationRef = doc(db, 'UsersCorporations', request.UserCorpId)

  updateDoc(userCorporationRef, {
    'ScreenRecommendationStaffRequested.denied': true
  })
}
</script>

<template>
  <div
    class="content-height thinsb h-full justify-between overflow-auto p-2 text-slate-700"
    v-if="store.loginUser && store.loginUserCorporation"
  >
    <h1
      class="select-none text-center"
    >
      {{ store.loginUser.Nickname }} {{ store.loginUser.LastName }}
    </h1>
    <h2>{{ store.loginUserCorporation.Status }}</h2>
    <h5 v-if="loginUserCorporation?.ApprovedOn">
      {{ dayjs(loginUserCorporation.ApprovedOn).format('LL') }}
    </h5>

    <!-- Pending Screening and Code of Conduct -->
    <div class="mx-auto my-5 w-fit max-w-lg shadow-md" v-if="codeCardText || !validConsent">
      <div class="pb-3">
        <div class="rounded-t bg-red-700 p-2 text-lg font-semibold text-white">Pending tasks</div>
        <div v-if="codeCardText" class="px-2 pt-3 text-left">
          &bull; {{ codeCardText }}
          <span class="cursor-pointer text-blue-600 underline" @click="codeEditing = true">
            Code of conduct
          </span>
        </div>
        <div v-if="!validConsent" class="px-2 pt-3 text-left">
          &bull; Please sign the
          <span class="cursor-pointer text-blue-600 underline" @click="consentEditing = true"
            >Consent to release and share information</span
          >
        </div>
      </div>
    </div>

    <!-- Renew Background Check -->
    <div
      class="mx-auto my-5 w-fit shadow-md"
      v-if="isCheckBackgroundExpiring || loginUser.ScreeningBackgroundCheckRenewalRequested"
    >
      <div class="pb-3">
        <div class="rounded-t bg-yellow-700 p-2 text-lg font-semibold text-white">
          Background check
        </div>
        <div class="px-2 pt-3 text-left">
          <div v-if="isCheckBackgroundExpiring">
            Your background check is expiring on
            <span class="font-semibold">
              {{
                dayjs(loginUser.ScreeningBackgroundDate)
                  .add(store.loginCorporation?.BackgroundCheckValidFor, 'y')
                  .format('MMMM D')
              }}
            </span>
          </div>
          <div>Awaiting background check</div>
        </div>
      </div>
    </div>

    <!-- Recomendations Requested -->
    <div v-if="store.loginUser.ScreenRecommendationNewUserRequested">
      <template
        v-for="request in store.loginUser.ScreenRecommendationNewUserRequested"
        :key="request.UserId"
      >
        <div class="mx-auto my-5 w-fit max-w-96 shadow-md">
          <div class="pb-3">
            <div class="rounded-t bg-orange-600 p-2 text-lg font-semibold text-white">
              Recommendation Requested!
            </div>
            <div class="px-2 pt-3 text-left">
              <span class="font-semibold">{{ request.Name }} {{ request.LastName }}</span>
              has requested your recommendation for work with minors at
              <span class="font-semibold">{{ request.CorpName }}</span>
            </div>
            <div class="p-2 text-left">
              {{ request.Comments }}
            </div>
            <div class="mt-2">
              <MyButton color="bg-green-700" @click="onToAcceptReq(request)">Recommend</MyButton>
              <MyButton color="bg-red-600" @click="onDeclineRecommendation(request)"
                >Decline</MyButton
              >
            </div>
          </div>
        </div>
      </template>
    </div>

    <!-- Dialog to acknowledge recommendations -->
    <Dialog
      :open="showDialogRecommendation"
      @close="showDialogRecommendation = false"
      class="relative z-50"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              Acknowledging Recommendation
              <FontAwesomeIcon @click="showDialogRecommendation = false" class="" icon="times" />
            </DialogTitle>
            <!-- Text -->
            <div class="my-dialog-content">
              I
              <input type="text" v-model="recommendationSignature" class="input-signature" />
              have completed the screening and selection training required by
              <span class="font-semibold">{{ recAccepted.CorpName }}</span
              >. I have known <span class="font-semibold">{{ recAccepted.Name }}</span>
              <span class="font-semibold">{{ recAccepted.LastName }}</span> for
              <input
                type="number"
                v-model="recommendationYears"
                class="input-signature w-12 text-center"
              />
              <span v-if="recommendationYears > 1">years</span><span v-else>year</span> and
              <input
                type="number"
                v-model="recommendationMonths"
                class="input-signature w-12 text-center"
              />
              <span v-if="recommendationMonths != 1"> months </span>
              <span v-else>month</span> and recommend
              <span class="mr-1 font-semibold">{{ recAccepted.Name }}</span> to work with minors at
              <span class="font-semibold">{{ recAccepted.CorpName }}</span
              >. I am not aware of any reason that
              <span class="font-semibold">{{ recAccepted.Name }}</span> should not be allowed to
              work with minors at <span class="font-semibold">{{ recAccepted.CorpName }}</span> and
              believe that <span class="font-semibold">{{ recAccepted.Name }}</span> is capable of
              maintaining appropriate boundaries with minors.
            </div>
            <!-- Buttons -->
            <div class="my-dialog-buttons">
              <!-- Cancel -->
              <MyButton color="bg-slate-600" @click="showDialogRecommendation == false"
                >Cancel</MyButton
              >
              <!-- Accept -->
              <MyButton
                color=""
                @click="onAcceptedRecommendation"
                :class="[
                  recommendationSignature.length > 2
                    ? 'bg-green-600'
                    : 'cursor-not-allowed bg-slate-500'
                ]"
                >Accept</MyButton
              >
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>

    <!-- Screening Cards Info -->
    <div class="flex flex-wrap justify-center gap-5">
      <!-- List of Code of Counduct Signed -->
      <div v-if="validCode || codeExpired" class="w-fit p-5 shadow-md">
        <div class="font-semibold">
          <FontAwesomeIcon icon="check" class="text-green-700" /> Code of conduct signed
        </div>
        <div class="pt-2">
          <template
            v-for="code in store.loginUserCorporation?.ScreeningReq?.Code"
            :key="code.CodeDate"
          >
            <div @click="showFile(code.path)" class="cursor-pointer p-1 text-blue-600 underline">
              {{ dayjs(code.Date).format('MMM DD, YYYY') }}
            </div>
          </template>
        </div>
      </div>

      <!-- Card with Consent Date -->
      <div v-if="validConsent && isConsentRequired" class="w-fit p-5 shadow-md">
        <div class="font-semibold">
          <FontAwesomeIcon icon="check" class="text-green-700" /> Consent to release and share
          information
        </div>
        <div
          @click="showFile(store.loginUserCorporation?.ScreeningReq?.Consent?.[0].path)"
          class="cursor-pointer p-2 text-blue-600 underline"
        >
          {{
            dayjs(store.loginUserCorporation?.ScreeningReq?.Consent?.[0].Date).format('MMM DD, YYYY')
          }}
        </div>
      </div>
    </div>

    <div class="mt-6">
      <MyButton
        v-if="store.loginCorporation?.FileHandbook"
        @click="
          showFile(
            `Corporations/${store.loginCorporationId}/Handbook/${store.loginCorporation?.FileHandbook}`
          )
        "
        >Safe Environment Handbook<FontAwesomeIcon class="ml-2" icon="file-pdf"
      /></MyButton>
      <MyButton v-if="store.loginCorporation?.FileAppendix"
      @click="
          showFile(
            `Corporations/${store.loginCorporationId}/Appendix/${store.loginCorporation?.FileAppendix}`
          )
        "
        >Directors’ Appendix<FontAwesomeIcon class="ml-2" icon="file-pdf"
      /></MyButton>
    </div>

    <div class="my-5">
      <UsersViewTrainingList :user="user" />
    </div>

    <!-- Screen to read and sign the Code of Conduct -->
    <div
      v-if="codeEditing && store.loginCorporation"
      class="absolute inset-0 z-50 justify-between bg-slate-200/95 p-2 text-left"
    >
      <div class="pdf-height thinsb mx-auto max-w-[816px] bg-white p-2 text-stone-600">
        <textarea
          ref="codeText"
          class="code-input thinsb w-full bg-white p-2"
          v-model="store.loginCorporation.Code"
          disabled
        ></textarea>
        <div class="mt-6 px-2" :class="{ invisible: !bottom }">
          I,
          <input
            type="text"
            v-model="signature"
            class="input-ring relative rounded border-0 bg-white px-2 py-0.5 text-sm outline-none ring-1 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
          />, have read the above guidelines and agree to abide by them in connection with all
          Activities and Programs involving Minors. I understand that I will be asked to review and
          sign my agreement with these guidelines annually.
        </div>
      </div>
      <div class="mt-5 text-center">
        <MyButton class="bg-slate-600" @click="codeEditing = false">Close</MyButton>
        <MyButton
          class="bg-green-600"
          @click="onCreatingEmailingCode"
          :disabled="signature.length < 3"
          >Accept</MyButton
        >
      </div>
    </div>

    <!-- Screen to Sign the Consent to Share Information -->
    <div
      v-if="consentEditing && store.loginCorporation"
      class="absolute inset-0 z-50 justify-between bg-slate-200/95 p-2 text-left"
    >
      <div class="pdf-height thinsb mx-auto max-w-[816px] bg-white p-2 text-stone-600">
        <div ref="consentText" class="thinsb w-full bg-white p-2">
          <p class="mb-3">
            I,
            <input
              v-if="!seeSignature"
              type="text"
              v-model="signatureConsent"
              class="input-ring relative rounded border-0 bg-white px-2 py-0.5 text-sm outline-none ring-1 placeholder:text-gray-400 focus:outline-none focus:ring-1 focus:ring-blue-300"
            />
            <span v-else>{{ signatureConsent }}</span
            >, hereby authorize the Prelature of the Holy Cross and Opus Dei - United States and
            Canada Region (“the Prelature”) to share the results of any criminal background check
            and records of abuse prevention training with {{ store.loginCorporation.Name }} ("{{
              store.loginCorporation.Short
            }}").
          </p>
          <p class="mb-3">
            In addition, I authorize {{ store.loginCorporation.Short }} to share with the Prelature
            any application submitted by me to volunteer for activities with minors as well as any
            notes of interviews and reference checks conducted in connection with my application.
          </p>
          <p class="mb-3">
            I authorize the Prelature to share with {{ store.loginCorporation.Short }} the
            information mentioned in the preceding paragraphs which has been obtained by any other
            organizations working with the Prelature and with which I have volunteered.
          </p>
          <p class="mb-3">
            I understand and agree that my information will not be used for any purpose other than
            determining my suitability to volunteer for activities with minors organized by
            {{ store.loginCorporation.Short }} and/or the Prelature. I understand that the Prelature
            does not assume any responsibility for my services with
            {{ store.loginCorporation.Short }}.
          </p>
          <p>
            {{ dayjs().format('MMMM D, YYYY') }}
          </p>
        </div>
        <div class="mt-6 px-2" :class="{ invisible: !bottom }"></div>
      </div>
      <div class="mt-5 text-center">
        <MyButton class="bg-slate-600" @click="consentEditing = false">Close</MyButton>
        <MyButton
          class="bg-green-600"
          @click="onCreatingEmailingConsent"
          :disabled="signatureConsent.length < 3"
          >Accept</MyButton
        >
      </div>
    </div>

    <!-- Loading Bar -->
    <div
      class="absolute left-0 right-0 top-7 mx-auto flex place-items-center justify-center"
      v-if="store.isUploadingFiles"
    >
      <div class="flex place-items-center rounded-lg bg-white px-2 py-1 shadow-lg">
        <div>Loading</div>
        <div class="relative ml-3 h-3 w-60 rounded-full bg-slate-300">
          <div
            class="absolute left-0 h-3 rounded-full bg-orange-400"
            :style="{ width: store.isUploadingFilesPercentage + '%' }"
          ></div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.input-signature {
  @apply relative border-b border-slate-400 bg-slate-100 px-1 py-0.5 text-sm outline-none focus:border-blue-400 focus:shadow;
}
.content-height {
  max-height: calc(100vh - 80px);
}
.pdf-height {
  max-height: calc(100vh - 80px);
  overflow-y: auto;
}
.code-input {
  height: calc(100vh - 200px);
}
.list-move, /* apply transition to moving elements */
.list-enter-active,
.list-leave-active {
  transition: all 0.5s ease;
}

.list-enter-from,
.list-leave-to {
  opacity: 0;
  transform: translateX(30px);
}

/* ensure leaving items are taken out of layout flow so that moving
   animations can be calculated correctly. */
.list-leave-active {
  position: absolute;
}
.message {
  @apply m-3 mx-auto w-fit rounded bg-orange-400/90 px-3 py-2 shadow-lg;
}
</style>
