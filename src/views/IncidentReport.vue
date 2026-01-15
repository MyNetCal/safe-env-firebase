<script setup>
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import dayjs from 'dayjs'
import LocalizedFormat from 'dayjs/plugin/localizedFormat'
import { ref } from 'vue'
import { useFirestore } from 'vuefire'
import { addDoc, collection, doc, setDoc, Timestamp } from 'firebase/firestore'
import { getEmailSECPrelature } from '@/stores/datadb'

const store = useGeneralStore()
const db = useFirestore()
dayjs.extend(LocalizedFormat)

const typesIncident = ref([
  'General Policy Violation',
  'Adult-to-Minor Boundary Violation',
  'Bullying / Hazing',
  'Verbal Assault',
  'Physical Assault',
  'Minor-to-Minor Sexual Activity',
  'Adult-to-Minor Sexual Abuse',
  'Other'
])
const date = ref(dayjs().format('YYYY-MM-DD'))
const time = ref(dayjs().format('HH:mm'))
const typeIncident = ref('')
const location = ref('')
const other = ref('')
const staffName = ref('')
const witness = ref('')
const description = ref('')
const response = ref('')

function resetForm() {
  time.value = dayjs().format('HH:mm')
  typeIncident.value = ''
  location.value = ''
  other.value = ''
  staffName.value = ''
  witness.value = ''
  description.value = ''
  response.value = ''
  statusCreatingPdf.value = false
}

const statusCreatingPdf = ref(false)

async function createSentReport() {
  statusCreatingPdf.value = true
  const pdfRef = doc(collection(db, 'pdfs'))
  const emailSECPrelature = await getEmailSECPrelature(store.currentBranch);
  const emailId = await addDoc(collection(db, `Users/${store.loginUserId}/MessagesPending`), {
    accepted:[],
    error: '',
    message: 'Preparing pdf and sending email',
    rejected: [],
    state: 'PENDING',
    type: 'Email',
  })
  const data = {
    type: 'Incident',
    emailId: emailId.id,
    userId: store.loginUserId,
    userCorpId: store.loginCurrentUsersCorporationsId,
    corpId: store.loginCorporationId,
    to: [store.loginUser.Email],
    bcc: [emailSECPrelature],
    date: `${date.value}T${time.value}`,
    stDate: dayjs(`${date.value}T${time.value}`).format('LLL'),
    location: location.value,
    typeIncident: typeIncident.value,
    otherInfo: other.value,
    staffName: staffName.value,
    witnessName: witness.value,
    description: description.value,
    staffResponse: response.value,
    sentName: store.loginUser.Nickname + ' ' + store.loginUser.LastName,
    corpName: store.loginCorporation.Name,
    branch: store.currentBranch,
    ExpiresAt: Timestamp.fromDate(new Date(dayjs().add(1, 'day').toISOString())),
    _pdfplum_config: {
      outputFileName: `${store.loginUserId}/${pdfRef.id}.pdf`,
      templatePath: 'vue-safe-env-pdfs/incident.zip',
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
  setDoc(pdfRef, data)
}
</script>

<template>
  <div class="p-1 flex flex-col h-full">
    <h1>Incident Report</h1>
    <div class="mx-auto mt-3 max-w-xl rounded-md border border-red-300 bg-red-200 p-2">
      To report an instance of <span class="font-bold">sexual abuse of a minor</span> by personnel
      of the Prelature, please contact the
      <span class="font-semibold">Prelature's Victim Response Coordinator</span> at
      <span class="select-text whitespace-nowrap font-bold"
        ><a href="tel:+646-742-2741">646-742-2741</a>
      </span>
    </div>

    <!-- Form -->
    <div class="mx-auto my-5 px-5 max-w-xl text-left overflow-auto">
      <div class="mb-3 flex flex-wrap gap-2">
        <MyInputText type-input="date" label="Date of incident" v-model="date" />
        <MyInputText type-input="time" label="Aprox. time" v-model="time" />
      </div>
      <MyInputText label="Location" class="mb-3" v-model="location" />
      <div class="max-w-sm">
        <MySelectAuto :items="typesIncident" label="Type of incident" v-model="typeIncident" />
      </div>
      <div v-if="typeIncident == '(8) Other'" class="mb-3">
        <MyInputTextArea label="Specify" v-model="other" />
      </div>
      <MyInputText class="mb-3" label="Name / role of program staff involved" v-model="staffName" />
      <MyInputText class="mb-3" label="Name/ role of witness" v-model="witness" />
      <MyInputTextArea class="" label="Describe the incident" v-model="description" />
      <MyInputTextArea
        class="mb-3"
        label="Describe the response of program staff"
        v-model="response"
      />
      <div class="text-center">
        <MyButton class="" @click="createSentReport">Submit</MyButton>
      </div>
    </div>

    <!-- Creating pdf -->
    <div
      v-if="statusCreatingPdf"
      class="absolute inset-0 z-20 flex place-items-center bg-slate-600/70"
    >
      <!-- Window wiht creating pdf status -->
      <div class="mx-auto rounded bg-orange-100 max-w-lg p-4 text-slate-600">
        <div class="text-center">
          <div>
            <div class="mt-2">
              You should receive an email with a copy of the incident report shortly. Please save
              the report for your records
            </div>
            <div class="mt-2">
              If you do not hear from the Safe Environment Coordinator within the next 7 days,
              please call
              <a href="tel:+646-742-2741">646-742-2741</a>
            </div>
          </div>
          <MyButton class="mt-5" @click="resetForm">Close</MyButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
