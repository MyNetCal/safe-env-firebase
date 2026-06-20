<script setup>
import { useGeneralStore } from '@/stores/general'
import { computed, watchEffect, ref, toRefs, watch } from 'vue'
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

const props = defineProps({
  user: Object
})
const { user } = toRefs(props)
const emit = defineEmits(['onClose'])

const model = defineModel()

const store = useGeneralStore()
const db = useFirestore()

const showDialogDeactivate = ref(false)
const showDialogReactivate = ref(false)

const isCommittee = computed(() => [2.5, 3, 4.5, 5].includes(store.accessLevel))

watchEffect(() => {
  model.value.Function = store.getFunction(model.value.Role)
})

function newSelCorporation(val) {
  model.value.CorporationName = val.Short
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
  model.value.Board = model.value.Role == store.ROLE_BOARD
  if (
    model.value.Role == store.ROLE_JUNIOR_COUNSELOR ||
    model.value.Role == store.ROLE_LOW_ACCESS_STAFF
  ) {
    model.value.Entity = store.ENTITY_PARTY
  }
  if (model.value.Role == store.ROLE_PRIEST) {
    model.value.Entity = store.ENTITY_PRELATURE
  }
}

const isErrorRole = computed(() => {
  const formula = model.value.Role == ''
  const label = 'Role no valid'
  return { formula, label }
})

const corpEntity = ref({})
const corp = ref({})
watchEffect(() => {
  if (model.value.CorporationId) {
    getDoc(doc(db, 'Corporations', model.value.CorporationId)).then((d) => {
      corpEntity.value = d.data().Entity
      corp.value = d.data()
    })
  }
})

watch(
  () => model.value.Committee,
  (nv) => {
    model.value.Screening = nv
  }
)

const entities = computed(() => {
  if (!corpEntity.value) return ''
  if (
    model.value.Role == store.ROLE_JUNIOR_COUNSELOR ||
    model.value.Role == store.ROLE_LOW_ACCESS_STAFF
  ) {
    return [store.ENTITY_PARTY]
  }
  if (model.value.Role == store.ROLE_PRIEST) {
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
  const subject = `${user.value.Name} ${user.value.LastName} is no longer Active`
  const html = `<p>Name: ${user.value.Name} ${user.value.LastName}</p>
              <p>Email: ${user.value.Email}</p>
              <p>Corporation: ${corp.value.Name}</p>
              <p>Role: ${model.value.Role}</p>
              <p>Entity: ${model.value.Entity}</p>
              <p>Board: ${model.value.Board ? 'Yes' : 'No'}</p>
              <p>Screening: ${model.value.Screening ? 'Yes' : 'No'}</p>`
  store.createDocTriggerEmail(subject, html, to, [], [])
}

async function deactivateUser() {
  deactivateEmailNotification()
  updateDoc(doc(db, 'UsersCorporations', model.value.id), {
    Active: false,
    Status: 'Inactive',
    StatusRquiringAttentionReasons: arrayUnion('No Active'),
    InactiveSince: dayjs().toISOString(),
    ApprovedOn: ''
  })
  await updateDoc(doc(db, 'Users', model.value.UserId), {
    CorpsActiveIds: arrayRemove(model.value.CorporationId)
  })
  const u = await getDoc(doc(db, 'Users', model.value.UserId))
  const userCorps = u.data().CorpsActiveIds
  updateDoc(doc(db, 'Users', model.value.UserId), {
    CorpsActiveAtLeastOne: userCorps.length > 0
  })
  showDialogDeactivate.value = false
  emit('onClose')
}

async function reactivateUser() {
  const inactiveSince = dayjs(model.value.InactiveSince)
  const dayLimit = dayjs().subtract(6, 'M')
  // Force a fresh background check if the user was inactive 6+ months, OR if
  // their existing background check has already expired during a shorter leave.
  const inactiveTooLong = inactiveSince.isBefore(dayLimit)
  const bcAlreadyExpired =
    model.value.BackgroundCheckExpiresOn &&
    dayjs().isAfter(dayjs(model.value.BackgroundCheckExpiresOn))
  const needsBackgroundCheck = inactiveTooLong || bcAlreadyExpired
  updateDoc(doc(db, 'UsersCorporations', model.value.id), {
    Active: true,
    Status: store.USER_STATUS_PENDING,
    StatusRquiringAttentionReasons: arrayRemove('No Active'),
    InactiveSince: '',
    ApprovedOn: '',
    ApprovedBy: [],
    CommitteeEmailSent: false
  })
  await updateDoc(doc(db, 'Users', model.value.UserId), {
    CorpsActiveIds: arrayUnion(model.value.CorporationId),
    CorpsActiveAtLeastOne: true
  })
  model.value.Active = true
  model.value.Status = store.USER_STATUS_PENDING
  model.value.StatusRquiringAttentionReasons = (model.value.StatusRquiringAttentionReasons || []).filter(r => r !== 'No Active')
  model.value.InactiveSince = ''
  model.value.ApprovedOn = ''
  model.value.ApprovedBy = []
  model.value.CommitteeEmailSent = false
  if (needsBackgroundCheck) {
    // Keep the real expired date when we have one; otherwise back-date to the
    // 6-month cutoff so it reads as expired.
    const expiresOn = bcAlreadyExpired
      ? model.value.BackgroundCheckExpiresOn
      : dayLimit.format('YYYY-MM-DD')
    updateDoc(doc(db, 'UsersCorporations', model.value.id), {
      StatusRquiringAttentionReasons: arrayUnion('Background Check Expired'),
      ScreeningReqFlagBackground: false,
      BackgroundCheckExpiresOn: expiresOn
    })
    if (!model.value.StatusRquiringAttentionReasons.includes('Background Check Expired')) {
      model.value.StatusRquiringAttentionReasons.push('Background Check Expired')
    }
    model.value.ScreeningReqFlagBackground = false
    model.value.BackgroundCheckExpiresOn = expiresOn
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
        Personnel Role at {{ model.CorporationName }}
      </h2>
      <div class="mb-5 text-center text-sm text-slate-500">
        [This information is specific to {{ model.CorporationName }}]
      </div>

      <div v-if="isUserAMinor" class="w-fit rounded bg-red-200 px-2 text-slate-700">
        The user is a minor
      </div>

      <!-- Select Corporation -->
      <div v-if="model.id == '' && store.isUserBoardPrelature">
        <MySelectCorporation v-model="model.CorporationId" @new-entry="newSelCorporation" />
      </div>

      <div class="flex flex-wrap gap-x-2">
        <div class="w-40 grow">
          <MySelectAuto
            :items="roles"
            v-model="model.Role"
            :id="null"
            label="Role (Choose the first option that applies)"
            :is-error="isErrorRole"
            @update:model-value="roleSelected"
            :disabled="!isCommittee"
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
            v-model="model.Entity"
            :id="null"
            info
            info-title="Entity"
            :disabled="!isCommittee"
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
          v-if="model.Role != store.ROLE_JUNIOR_COUNSELOR"
          :disable="!isCommittee"
          v-model="model.Board"
          label="Board Member also"
        ></MyInputCheckBox>
        <MyInputCheckBox
          v-if="model.Role != store.ROLE_JUNIOR_COUNSELOR"
          v-model="model.Committee"
          label="Safe Environment Committee Member"
          :disable="!isCommittee"
        ></MyInputCheckBox>
        <MyInputCheckBox
          v-if="
            store.getFunction(model.Role) == store.FUNCTION_BOARD ||
            store.getFunction(model.Role) == store.FUNCTION_DIRECTOR ||
            model.Role == store.ROLE_LOW_ACCESS_STAFF ||
            model.Role == store.ROLE_STAFF
          "
          v-model="model.Screening"
          label="Screening staff"
          :disable="model.Committee || !isCommittee"
        ></MyInputCheckBox>
      </div>

      <div class="flex gap-x-2">
        <MyInputTextArea class="w-full" v-model="model.Notes" label="Notes" :disabled="!isCommittee"/>
      </div>
      <div v-if="model.id" class="my-2 text-center">
        <MyButton v-if="model.Active" class="bg-red-600" @click="showDialogDeactivate = true"
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
