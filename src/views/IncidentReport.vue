<script setup>
import MyButton from '@/components/MyButton.vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import { useGeneralStore } from '@/stores/general'
import axios from 'axios'
import dayjs from 'dayjs'
import { ref } from 'vue'

const store = useGeneralStore()

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
const time = ref('12:00')
const typeIncident = ref('')
const location = ref('')
const other = ref('')
const staffName = ref('')
const witness = ref('')
const description = ref('')
const response = ref('')

function sentEmail() {
  const formData = new FormData()
  formData.append('email', store.loginCorporation.EmailFiles)
  formData.append(
    'content',
    `
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
  axios
    .post('https://mynetcalendar.org/safeenv-email-incident-report.php', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    .then((res) => {
      console.log('Email REsult: ', res.data)
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
        <MyButton class="" @click="sentEmail">Submitt</MyButton>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
