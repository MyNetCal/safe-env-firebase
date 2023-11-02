<script setup>
import MyModal from '@/components/MyModal.vue'
import MyButton from '@/components/MyButton.vue'
import { ref, toRefs } from 'vue'
import MyInputText from '@/components/MyInputs/MyInputText.vue'
import MyInputCheckBox from '@/components/MyInputs/MyInputCheckBox.vue'
import MyInputTextArea from '@/components/MyInputs/MyInputTextArea.vue'
import SitesViewEditPhotos from './SitesViewEditPhotos.vue'
import SitesViewEditChecklist from './SitesViewEditChecklist.vue'
import { useMediaQuery } from '@vueuse/core'
import { arrayUnion, collection, doc, setDoc, updateDoc } from 'firebase/firestore'
import { useFirestore } from 'vuefire'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { useGeneralStore } from '@/stores/general'

const emits = defineEmits(['onClose', 'onUpdate', 'onChangeTab'])
const props = defineProps({ showModal: Boolean, site: Object, corp: Object })

const { showModal, site, corp } = toRefs(props)

const db = useFirestore()
const store = useGeneralStore()

const isLargeScreen = useMediaQuery('(min-width: 640px)')

const tabActive = ref(0)
const tabTitles = ['General info', 'Details', 'Photos', 'Checklist']

const siteToEdit = ref()
const siteRefDB = ref()

siteToEdit.value = JSON.parse(JSON.stringify(site.value))
const bothBranches = ref(false)
bothBranches.value = siteToEdit.value.Branch == 'both'

siteRefDB.value =
  siteToEdit.value.id == '' ? doc(collection(db, 'Sites')) : doc(db, 'Sites', siteToEdit.value.id)

function onSaveGeneralInfo() {
  console.log('Saving')
  siteToEdit.value.id = siteRefDB.value.id
  siteToEdit.value.Branch = bothBranches.value ? 'both' : store.loginUser.Branch
  siteToEdit.value.CorpIds = [corp.value.id]
  siteToEdit.value.CreatedByUser = store.loginUserId
  siteToEdit.value.CreatedByCorp = corp.value.id
  setDoc(siteRefDB.value, siteToEdit.value)
  updateDoc(doc(db, 'Corporations', corp.value.id), {
    SiteIds: arrayUnion(siteToEdit.value.id)
  })
}

function onUpdateGeneralInfo() {
  console.log('Updating')
  siteToEdit.value.Branch = bothBranches.value ? 'both' : store.loginUser.Branch
  updateDoc(doc(db, 'Sites', siteToEdit.value.id), {
    Address: siteToEdit.value.Address,
    Branch: siteToEdit.value.Branch,
    Name: siteToEdit.value.Name,
    Notes: siteToEdit.value.Notes
  })
}

function onUpdateDetails(field) {
  console.log('Updating Details: ', siteToEdit.value[field])
  updateDoc(doc(db, 'Sites', siteToEdit.value.id), {
    [field]: siteToEdit.value[field]
  })
}

function onReadyToBeApproved() {
  updateDoc(doc(db, 'Sites', siteToEdit.value.id), {
    Status: 'Waiting Approval'
  })
  emits('onChangeTab', 1)
}
</script>

<template>
  <div>
    <MyModal :showModal="showModal" title="Editing Site" @onClose="$emit('onClose')">
      <div class="modal-height flex flex-col justify-between p-1">
        <!-- *********** -->
        <!-- Tab Headers -->
        <!-- *********** -->
        <div class="mt-3">
          <div class="mb-3 flex justify-between">
            <template v-for="(tabTitle, index) in tabTitles" :key="tabTitle">
              <div
                class="group relative flex grow cursor-pointer place-items-center"
                @click="tabActive = index"
                :class="{ 'pointer-events-none': siteToEdit.id == '' && index > 0 }"
              >
                <!-- Left Line -->
                <div
                  v-if="isLargeScreen"
                  class="relative -top-3 grow"
                  :class="{ 'border border-slate-300': index != 0 }"
                ></div>
                <!-- Number & Title -->
                <div class="">
                  <!-- Number -->
                  <div
                    :class="{ 'bg-blue-600 text-blue-50': tabActive == index }"
                    class="mx-auto flex h-8 w-8 place-items-center justify-center rounded-full border border-blue-300 shadow group-hover:bg-blue-300"
                  >
                    {{ index + 1 }}
                  </div>
                  <!-- Title -->
                  <div
                    class="text-xs font-semibold uppercase group-hover:text-blue-600"
                    :class="[tabActive == index ? 'text-blue-600' : 'text-slate-600']"
                  >
                    {{ tabTitle }}
                  </div>
                </div>
                <!-- Right Line -->
                <div
                  v-if="isLargeScreen"
                  class="relative -top-3 grow"
                  :class="{ 'border border-slate-300': index < tabTitles.length - 1 }"
                ></div>
              </div>
            </template>
          </div>
        </div>

        <!-- ************ -->
        <!-- Tabs Content -->
        <!-- ************ -->
        <div class="tab-height thinsb grow p-2">
          <!-- Tab: 1. General Info -->
          <div v-show="tabActive == 0">
            <div class="mx-auto mb-3 max-w-md">
              <!-- Name and Branch -->
              <div class="flex flex-wrap gap-2">
                <MyInputText v-model="siteToEdit.Name" label="Name" class="grow" />
                <MyInputCheckBox v-model="bothBranches" label="Both Branches" />
              </div>
              <MyInputTextArea v-model="siteToEdit.Address" label="Address" />
              <MyInputTextArea v-model="siteToEdit.Notes" label="Notes" />
            </div>
            <div class="text-center">
              <MyButton
                @click="() => (siteToEdit.id == '' ? onSaveGeneralInfo() : onUpdateGeneralInfo())"
                color="bg-green-600"
                class=""
                >{{ siteToEdit.id == '' ? 'Add Site' : 'Update' }}
              </MyButton>
            </div>
          </div>

          <!-- Tab: 2. Details -->
          <div v-show="tabActive == 1">
            <!-- Sections -->
            <div class="mx-auto max-w-md">
              <MyInputTextArea
                v-model="siteToEdit.Lodging"
                label="Lodging Arrangements"
                @change="onUpdateDetails('Lodging')"
              />
              <MyInputTextArea
                v-model="siteToEdit.Bathroom"
                label="Bathroom  Arrangements"
                @change="onUpdateDetails('Bathroom')"
              />
              <MyInputTextArea
                v-model="siteToEdit.Monitoring"
                label="Monitoring and Supervision Arrangements"
                @change="onUpdateDetails('Monitoring')"
              />
            </div>
          </div>

          <!-- Tab: 3. Photos -->
          <div v-show="tabActive == 2" v-if="siteToEdit.id">
            <SitesViewEditPhotos :site="siteToEdit" />
          </div>

          <!-- Tab: 4. Checklist -->
          <div v-show="tabActive == 3">
            <SitesViewEditChecklist :site="siteToEdit" />
          </div>
        </div>

        <!-- Buttons -->
        <div class="pt-2">
          <div class="text-center text-red-700 mb-2">
            <!-- Button: OnReadyToBeApproved -->
            <MyButton
              @click="onReadyToBeApproved"
              :disabled="siteToEdit.id == ''"
              color="bg-orange-600"
              >Ready to be Approved</MyButton
            >
            <div>
              This Site is being created by <span class="font-semibold">{{ corp.Short }}</span>
            </div>
          </div>

          <!-- Navigation Buttons -->
          <div class="my-1 flex justify-around">
            <!-- Left -->
            <MyButton @click="tabActive--" color="bg-slate-600" :disabled="tabActive == 0">
              <FontAwesomeIcon icon="arrow-left" />
            </MyButton>
            <!-- Close -->
            <MyButton @click="$emit('onClose')" color="bg-slate-600"> Close </MyButton>
            <!-- Right -->
            <MyButton
              @click="tabActive++"
              color="bg-slate-600"
              :disabled="tabActive == tabTitles.length - 1 || siteToEdit.id == ''"
            >
              <FontAwesomeIcon icon="arrow-right" />
            </MyButton>
          </div>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<style scoped>
.grid-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  grid-template-rows: auto;
  gap: 6px;
}
.grid-content-md {
  display: grid;
  grid-template-columns: 1fr;
  grid-template-rows: auto;
  gap: 6px;
}
.tab-height {
  max-height: calc(100vh - 250px);
  overflow-y: auto;
}
.modal-height {
  height: calc(100vh - 80px);
}
</style>
