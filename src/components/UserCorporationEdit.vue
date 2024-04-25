<script setup>
import { useGeneralStore } from '@/stores/general'
import { computed, watchEffect, ref } from 'vue'
import MySelectCorporation from './MySelect/MySelectCorporation.vue'
import MySelectAuto from './MyInputs/MySelectAuto.vue'
import { arrayRemove, arrayUnion, doc, getDoc, updateDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import MyInputCheckBox from './MyInputs/MyInputCheckBox.vue'
import { getEmailSECPrelature } from '@/stores/datadb'
import MyInputTextArea from './MyInputs/MyInputTextArea.vue'
import MyButton from './MyButton.vue'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import dayjs from 'dayjs'

const props = defineProps({ modelValue: Object })
const emit = defineEmits(['update:modelValue', 'onClose'])

const store = useGeneralStore()
const db = useFirestore()

const showDialogDeactivate = ref(false)
const showDialogReactivate = ref(false)

const corpToEdit = computed({
  get() {
    return props.modelValue
  },
  set(value) {
    emit('update:modelValue', value)
  }
})

watchEffect(() => {
  corpToEdit.value.Function = store.getFunction(corpToEdit.value.Role)
})

function newSelCorporation(val) {
  corpToEdit.value.CorporationName = val.Short
}

const isUserAMinor = computed(() => dayjs().diff(dayjs(user.value?.DOB), 'years') < 18)

const roles = computed(() => {
  if (isUserAMinor.value) {
    return [store.ROLE_JUNIOR_COUNSELOR]
  }
  return store.ROLES.filter(
    (r) => corp.value?.Roles?.includes(r) && r != store.ROLE_JUNIOR_COUNSELOR
  )
})

function roleSelected() {
  corpToEdit.value.Screening = corpToEdit.value.Role == store.ROLE_BOARD
  corpToEdit.value.Board = corpToEdit.value.Role == store.ROLE_BOARD
  if (
    corpToEdit.value.Role == store.ROLE_JUNIOR_COUNSELOR ||
    corpToEdit.value.Role == store.ROLE_LOW_ACCESS_STAFF
  ) {
    corpToEdit.value.Entity = store.ENTITY_PARTY
  }
  if (corpToEdit.value.Role == store.ROLE_PRIEST) {
    corpToEdit.value.Entity = store.ENTITY_PRELATURE
  }
}

const isErrorRole = computed(() => {
  const formula = corpToEdit.value.Role == ''
  const label = 'Role no valid'
  return { formula, label }
})

const corpEntity = ref({})
const user = ref({})
const corp = ref({})
watchEffect(() => {
  if (corpToEdit.value.CorporationId) {
    getDoc(doc(db, 'Corporations', corpToEdit.value.CorporationId)).then((d) => {
      corpEntity.value = d.data().Entity
      corp.value = d.data()
    })
  }
  if (corpToEdit.value.UserId) {
    getDoc(doc(db, 'Users', corpToEdit.value.UserId)).then((d) => {
      user.value = d.data()
      if (isUserAMinor.value) {
        corpToEdit.value.Role = store.ROLE_JUNIOR_COUNSELOR
        corpToEdit.value.Entity = store.ENTITY_PARTY
      }
    })
  }
})

const entities = computed(() => {
  if (!corpEntity.value) return ''
  if (
    corpToEdit.value.Role == store.ROLE_JUNIOR_COUNSELOR ||
    corpToEdit.value.Role == store.ROLE_LOW_ACCESS_STAFF
  ) {
    return [store.ENTITY_PARTY]
  }
  if (corpToEdit.value.Role == store.ROLE_PRIEST) {
    return [store.ENTITY_PRELATURE]
  }

  return corpEntity.value == store.ENTITY_PRELATURE
    ? [store.ENTITY_PRELATURE]
    : corpEntity.value == store.ENTITY_PARTY
      ? [store.ENTITY_PARTY]
      : [store.ENTITY_PRELATURE, store.ENTITY_PARTY]
})

async function deactivateEmailNotification() {
  const to = await getEmailSECPrelature()
  const cc = 'casedu@gmail.com'
  const subject = `${user.value.Name} ${user.value.LastName} is no longer Active`
  const html = `<p>Name: ${user.value.Name} ${user.value.LastName}</p>
              <p>Email: ${user.value.Email}</p>
              <p>Corporation: ${corp.value.Name}</p>
              <p>Role: ${corpToEdit.value.Role}</p>
              <p>Entity: ${corpToEdit.value.Entity}</p>
              <p>Board: ${corpToEdit.value.Board ? 'Yes' : 'No'}</p>
              <p>Screening: ${corpToEdit.value.Screening ? 'Yes' : 'No'}</p>`
  store.createDocTriggerEmail(subject, html, to, [], cc)
}

async function deactivateUser() {
  deactivateEmailNotification()
  updateDoc(doc(db, 'UsersCorporations', corpToEdit.value.id), {
    Active: false,
    Status: 'Inactive',
    StatusRquiringAttentionReasons: arrayUnion('No Active'),
    InactiveSince: dayjs().toISOString(),
    ApprovedOn: ''
  })
  await updateDoc(doc(db, 'Users', corpToEdit.value.UserId), {
    CorpsActiveIds: arrayRemove(corpToEdit.value.CorporationId)
  })
  const u = await getDoc(doc(db, 'Users', corpToEdit.value.UserId))
  const userCorps = u.data().CorpsActiveIds
  updateDoc(doc(db, 'Users', corpToEdit.value.UserId), {
    CorpsActiveAtLeastOne: userCorps.length > 0
  })
  showDialogDeactivate.value = false
  emit('onClose')
}

async function reactivateUser() {
  const inactiveSince = dayjs(corpToEdit.value.InactiveSince)
  const dayLimit = dayjs().subtract(6, 'M')
  const needsBackgroundCheck = inactiveSince.isBefore(dayLimit)
  updateDoc(doc(db, 'UsersCorporations', corpToEdit.value.id), {
    Active: true,
    Status: store.USER_STATUS_ATTENTION,
    StatusRquiringAttentionReasons: arrayUnion('No Active'),
    InactiveSince: '',
    ApprovedOn: '',
    ApprovedBy: []
  })
  await updateDoc(doc(db, 'Users', corpToEdit.value.UserId), {
    CorpsActiveIds: arrayUnion(corpToEdit.value.CorporationId),
    CorpsActiveAtLeastOne: true
  })
  if (needsBackgroundCheck) {
    updateDoc(doc(db, 'UsersCorporations', corpToEdit.value.id), {
      StatusRquiringAttentionReasons: arrayUnion('Background Check Expired'),
      ScreeningReqFlagBackground: false,
      BackgroundCheckExpiresOn: dayLimit.format('YYYY-MM-DD')
    })
  }
  showDialogReactivate.value = false
  emit('onClose')
}
</script>

<template>
  <div>
    <div class="min-h-52">
      <!-- Title -->
      <h2 class="text-center font-medium text-blue-500">
        Personnel Role at {{ corpToEdit.CorporationName }}
      </h2>
      <div class="mb-5 text-center text-sm text-slate-500">
        [This information is specific to {{ corpToEdit.CorporationName }}]
      </div>

      <div v-if="isUserAMinor">The user is a Minor</div>

      <!-- Select Corporation -->
      <div v-if="corpToEdit.id == '' && store.isUserBoardPrelature">
        <MySelectCorporation v-model="corpToEdit.CorporationId" @newEntry="newSelCorporation" />
      </div>

      <div class="flex flex-wrap gap-x-2">
        <div class="w-40 grow">
          <MySelectAuto
            :items="roles"
            v-model="corpToEdit.Role"
            :id="null"
            label="Role (Choose the first option that applies)"
            :isError="isErrorRole"
            @update:model-value="roleSelected"
            info
            info-title="Role"
          >
            <p>Choose “Activity Director” for anyone who will direct any activity.</p>
            <p>
              Choose “Low Access” for anyone who is not directly involved in activities with minors
              or who does not interact directly with minors
            </p></MySelectAuto
          >
        </div>
        <div class="w-28 grow">
          <MySelectAuto
            label="Entity"
            :items="entities"
            v-model="corpToEdit.Entity"
            :id="null"
            info
            info-title="Entity"
          >
            <p>
              Choose “Prelature” for anyone who will be staff for any traditional means of
              formation.
            </p>
            <p>
              Choose “3rd Party Only” for anyone who will not be staff for any traditional means of
              formation
            </p></MySelectAuto
          >
        </div>
      </div>

      <div class="flex gap-x-2">
        <MyInputCheckBox
          v-if="corpToEdit.Role != store.ROLE_JUNIOR_COUNSELOR"
          :disable="store.getFunction(corpToEdit.Role) == store.FUNCTION_BOARD"
          v-model="corpToEdit.Board"
          label="Board Member also"
        ></MyInputCheckBox>
        <MyInputCheckBox
          v-if="
            store.getFunction(corpToEdit.Role) == store.FUNCTION_BOARD ||
            store.getFunction(corpToEdit.Role) == store.FUNCTION_DIRECTOR ||
            corpToEdit.Role == store.ROLE_LOW_ACCESS_STAFF
          "
          :disable="store.getFunction(corpToEdit.Role) == store.FUNCTION_BOARD"
          v-model="corpToEdit.Screening"
          label="Screening staff"
        ></MyInputCheckBox>
      </div>

      <div class="flex gap-x-2">
        <MyInputTextArea class="w-full" v-model="corpToEdit.Notes" label="Notes" />
      </div>
      <div v-if="corpToEdit.id" class="my-2 text-center">
        <MyButton v-if="corpToEdit.Active" class="bg-red-600" @click="showDialogDeactivate = true"
          >Not active anymore</MyButton
        >
        <MyButton v-else class="bg-grean-600" @click="showDialogReactivate = true"
          >Re-activate</MyButton
        >
      </div>
    </div>

    <!-- Warning: Deactivating a User -->
    <Dialog
      :open="showDialogDeactivate"
      @close="showDialogDeactivate = false"
      class="relative z-50"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              {{ user.Nickname }} {{ user.LastName }}
              <FontAwesomeIcon @click="showDialogDeactivate = false" class="" icon="times" />
            </DialogTitle>
            <div class="my-dialog-content">
              <p class="mb-2">Important:</p>
              <p class="mb-2">
                {{ user.Nickname }} {{ user.LastName }} will no longer be able to staff any
                activities with minors. An email notification will be sent to the Safe Environment
                Coordinator of the Prelature. In case he becomes active again he will have to be
                approved by the Board. Also, if he stays inactive for 6 months or more he will be
                required to get a new background check.
              </p>
              <p class="mb-2">Do you want to continue?</p>
            </div>
            <div class="my-dialog-buttons my-4">
              <MyButton class="bg-slate-600" @click="showDialogDeactivate = false">Close</MyButton>
              <MyButton class="bg-red-700" @click="deactivateUser">Deactivate</MyButton>
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>

    <!-- Warning: Activating a User -->
    <Dialog
      :open="showDialogReactivate"
      @close="showDialogReactivate = false"
      class="relative z-50"
    >
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              {{ user.Nickname }} {{ user.LastName }}
              <FontAwesomeIcon @click="showDialogReactivate = false" class="" icon="times" />
            </DialogTitle>
            <div class="my-dialog-content">
              <p class="my-2">Note:</p>
              <p class="mb-2">
                After being activated {{ user.Nickname }} {{ user.LastName }} will have to be
                approved by the Board to start staffing activities with minors. Also, if he was
                inactive for 6 months or more he will be required to get a new background check
              </p>
            </div>
            <div class="my-dialog-buttons">
              <MyButton class="bg-slate-600" @click="showDialogReactivate = false">Close</MyButton>
              <MyButton class="bg-green-700" @click="reactivateUser">Re-activate</MyButton>
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped></style>
