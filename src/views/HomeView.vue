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
import { doc, arrayUnion, collection, addDoc, setDoc, arrayRemove } from 'firebase/firestore'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

import { useGeneralStore } from '@/stores/general'
import UsersViewTrainingList from './Users/UsersViewTrainingList.vue'

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

dayjs.extend(localizedFormat).extend(relativeTime)

const corpId = computed(() => store.loginCorporationId)
const loginUser = computed(() => store.loginUser)
const loginUserCorporation = computed(() => store.loginUserCorporation)

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

const user = computed(() => {
  const userCorp = JSON.parse(JSON.stringify(store.loginUserCorporation))
  userCorp.UserData = JSON.parse(JSON.stringify(store.loginUser))
  return userCorp
})

const validConsent = computed(() => store.loginUserCorporation?.ScreeningReqFlagConsent || false)

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
  setDoc(pdfRef, data)
}

function showFile(file) {
  getDownloadURL(storageRef(storage, file)).then((url) => {
    window.open(url)
  })
}
</script>

<template>
  <div
    class="content-height thinsb h-full justify-between overflow-auto p-2 text-slate-700"
    v-if="store.loginUser && store.loginUserCorporation"
  >
    <h1 class="select-none text-center">
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
          &bull; Please Sign the
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
      <div v-if="validConsent" class="w-fit p-5 shadow-md">
        <div class="font-semibold">
          <FontAwesomeIcon icon="check" class="text-green-700" /> Consent to release and share
          information
        </div>
        <div
          @click="showFile(store.loginUserCorporation?.ScreeningReq?.Consent?.[0].path)"
          class="cursor-pointer p-2 text-blue-600 underline"
        >
          {{
            dayjs(store.loginUserCorporation?.ScreeningReq?.Consent?.Date).format('MMM DD, YYYY')
          }}
        </div>
      </div>
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
            /><span v-else>{{ signatureConsent }}</span
            >, hereby authorize {{ store.loginCorporation.Name }} (“the Program”) to share my
            biographical information with the Prelature of the Holy Cross and Opus Dei - United
            States Region (“the Prelature”), for the sole purpose of providing the Program and me
            access to services offered by Praesidium, specifically, Criminal Background Check
            services and Training services.
          </p>
          <p class="mb-3">
            I understand and agree that my information will otherwise be kept confidential and will
            not be used for any purpose beyond those described above. I understand that the
            Prelature does not assume any responsibility for my services as Program Staff in the
            Program, nor does the Prelature assume any responsibility for the services offered by
            Praesidium. I understand that the Prelature is simply and only offering the Program and
            me access to services provided by Praesidium.
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
