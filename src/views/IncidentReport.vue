<script setup>
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import axios from 'axios'
import dayjs from 'dayjs'
import jsPDF from 'jspdf'
import { computed, ref } from 'vue'
import { ref as storageRef, uploadBytesResumable } from 'firebase/storage'
import { useFirebaseStorage, useFirestore } from 'vuefire'
import { doc, setDoc } from 'firebase/firestore'

const store = useGeneralStore()
const storage = useFirebaseStorage()
const db = useFirestore()

const typesIncident = ref([
  '(1) General Policy Violation',
  '(2) Adult-to-Minor Boundary Violation',
  '(3) Bullying / Hazing',
  '(4) Verbal Assault',
  '(5) Physical Assault',
  '(6) Minor-to-Minor Sexual Activity',
  '(7) Adult-to-Minor Sexual Abuse',
  '(8) Other'
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
  time.value = ref(dayjs().format('HH:mm'))
  typeIncident.value = ''
  location.value = ''
  other.value = ''
  staffName.value = ''
  witness.value = ''
  description.value = ''
  response.value = ''
  statusCreatingPdf.value = ''
}

const pdfContent = computed(
  () => `
    <p style='font-weight: 700'>Incident Report</p>
    <p></p>
    <p><span style='font-weight: 700'>Date: </span>${dayjs(date.value).format('MMMM D, YYYY')} @ ${
      time.value
    }</p>
    <p><span style='font-weight: 700'>Location: </span>${location.value}</p>
    <p><span style='font-weight: 700'>Type of Incident: </span>${typeIncident.value}</p>
    <p><span style='font-weight: 700'>Other information: </span>${other.value}</p>
    <p><span style='font-weight: 700'>Staff involved: </span>${staffName.value}</p>
    <p><span style='font-weight: 700'>Witness: </span>${witness.value}</p>
    <p><span style='font-weight: 700'>Description of the Incident: </span>${description.value}</p>
    <p><span style='font-weight: 700'>Resposne from Staff: </span>${response.value}</p>
    <p><span style='font-weight: 700'>Sent by </span>${store.loginUser.Nickname} ${
      store.loginUser.LastName
    } from ${store.loginCorporation.Name} </p>
        `
)

const statusCreatingPdf = ref('')
const b = ref()
let idFile = ''
const successEmail = ref(false)
const errorEmail = ref(false)

function createPDF() {
  successEmail.value = false
  errorEmail.value = false
  statusCreatingPdf.value = 'Creating PDF...'
  const pdfDoc = new jsPDF({ format: 'letter', unit: 'px', hotfixes: ['px_scaling'] })
  pdfDoc.html(pdfContent.value, {
    callback: function (pdfDoc) {
      // The pdf has been created
      b.value = pdfDoc.output('blob')
      idFile = self.crypto.randomUUID()
      const fileRef = storageRef(storage, `IncidentReports/${idFile}.pdf`)

      // Uploading File to the Server
      statusCreatingPdf.value = 'Saving Report Info...'
      store.isUploadingFiles = true
      store.isUploadingFilesPercentage = 0
      const uploadTask = uploadBytesResumable(fileRef, b.value)
      uploadTask.on(
        'state_changed',
        (snapshot) => {
          // progress uploading the file
          store.isUploadingFilesPercentage = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
        },
        (error) => {
          statusCreatingPdf.value = 'Error Uploading File: ' + error
          // error uploading the file
          store.isUploadingFiles = false
          console.log('ERROR', error)
          errorEmail.value.true
        },
        () => {
          // the file has been uploaded
          sentEmail()
          console.log('DONE')
          store.isUploadingFiles = false
        }
      )
    },
    x: 0,
    y: 0,
    margin: [24, 24, 24, 24],
    autoPaging: 'text',
    width: 768, // letter width: 8.5 * 96 = 816; Margins: 2 * 24 = 48; Content width: 816 - 48 = 768
    windowWidth: 768
  })
}

function sentEmail() {
  const formData = new FormData()
  formData.append('email1', store.loginCorporation.EmailFiles)
  formData.append('email2', store.loginUser.Email)
  formData.append('content', pdfContent.value)
  formData.append('idFile', idFile)
  formData.append('file', b.value, `${idFile}.pdf`)
  axios
    .post('https://mynetcalendar.org/safeenv-email-incident-report.php', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then((res) => {
      console.log('Email REsult: ', res.data)
      if (res.data.success) {
        successEmail.value = true
        statusCreatingPdf.value = 'Email has been Sent'
        setDoc(doc(db, 'IncidentReports', idFile), {
          Date: dayjs().toISOString(),
          Corporation: store.loginCorporation.Name,
          UserId: store.loginUserId,
          UserName: store.loginUser.Nickname + ' ' + store.loginUser.LastName
        })
      } else {
        statusCreatingPdf.value = 'Error sending email: ' + res.data.message
        errorEmail.value = true
      }
    })
}
</script>

<template>
  <div class="p-1">
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
    <div class="mx-auto mt-5 max-w-xl text-left">
      <div class="mb-3 flex flex-wrap gap-2">
        <MyInputText typeInput="date" label="Date of Incidente" v-model="date" />
        <MyInputText typeInput="time" label="Aprox. Time" v-model="time" />
      </div>
      <MyInputText label="Location" class="mb-3" v-model="location" />
      <div class="max-w-sm">
        <MySelectAuto :items="typesIncident" label="Type of incident" v-model="typeIncident" />
      </div>
      <div v-if="typeIncident == '(8) Other'" class="mb-3">
        <MyInputTextArea label="Specify" v-model="other" />
      </div>
      <MyInputText class="mb-3" label="Name / Role of Program Staff Involved" v-model="staffName" />
      <MyInputText class="mb-3" label="Name/ Role of Witness" v-model="witness" />
      <MyInputTextArea class="" label="Describe the Incident" v-model="description" />
      <MyInputTextArea
        class="mb-3"
        label="Describe the Response of Program Staff"
        v-model="response"
      />
      <div class="text-center">
        <MyButton class="" @click="createPDF">Submitt</MyButton>
      </div>
    </div>

    <!-- Creating pdf -->
    <div
      v-if="statusCreatingPdf != ''"
      class="absolute inset-0 z-20 flex place-items-center bg-slate-600/70"
    >
      <!-- Window wiht creating pdf status -->
      <div class="m-2 w-full rounded bg-slate-50 p-4 text-slate-600">
        <div class="text-center">
          <div>{{ statusCreatingPdf }}</div>
          <div v-if="successEmail">
            <div class="mt-2">
              You should promptly received a copy of the email sent with the Incident Report
              information
            </div>
            <div class="mt-2">
              Also, You should recive a reply from the Safe Environment Coordinator shortly. In case
              you don't get a reply in the next couple of hours please call to
              <a href="tel:+646-742-2741">646-742-2741</a> without further delay
            </div>
          </div>
          <div v-if="errorEmail" class="mt-2 text-red-700">
            <div>Sorry, your email couldn't be sent. Please call to
              <a href="tel:+646-742-2741">646-742-2741</a> without further delay</div>
          </div>
          <MyButton class="mt-5" @click="resetForm">Close</MyButton>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
