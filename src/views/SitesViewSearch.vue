<script setup>
import MyButton from '@/components/MyButton.vue'
import MySelectAuto from '@/components/MyInputs/MySelectAuto.vue'
import MyModal from '@/components/MyModal.vue'
import { useGeneralStore } from '@/stores/general'
import { useCollection, useFirestore } from 'vuefire'
import { computed, ref } from 'vue'
import { collection, orderBy, query, where } from 'firebase/firestore'

defineEmits(['onClose', 'onUpdate'])
defineProps({ showModal: Boolean })

const db = useFirestore()
const store = useGeneralStore()

const querySites = computed(() =>
  query(
    collection(db, 'Sites'),
    where('Branch', 'in', [store.loginUser.Branch, 'both']),
    orderBy('Name')
  )
)

const siteSelected = ref({})
const items = useCollection(querySites)
</script>

<template>
  <MyModal :showModal="showModal" title="" @onClose="$emit('onClose')">
    <div class="content flex flex-col justify-between">
      <h2 class="mb-5 text-center">Search</h2>

      <div class="mx-auto w-fit grow">
        <MySelectAuto
          label="Sites"
          :items="items"
          itemsLabel="Name"
          v-model="siteSelected"
        ></MySelectAuto>
        <MyButton v-if="siteSelected.id">Add Site</MyButton>
      </div>
      <!-- Buttons -->
      <div class="mb-8 flex justify-center">
        <MyButton @click="$emit('onClose')" color="bg-blue-600"> Close </MyButton>
      </div>
    </div>
  </MyModal>
</template>

<style scoped>
.content {
  height: calc(100vh - 80px);
}
</style>
