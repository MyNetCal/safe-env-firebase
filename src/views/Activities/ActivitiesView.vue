<script setup>
import MySelectCorporation from '@/components/MySelect/MySelectCorporation.vue';
import { useGeneralStore } from '@/stores/general';
import { ref, watchEffect } from 'vue';


const store = useGeneralStore()
const currentCorpId = ref(store.loginCorporationId)

watchEffect(() => {
  currentCorpId.value = store.loginCorporationId
})

</script>

<template>
  <div>
    <!-- Header -->
    <div>
      <h1 class="mb-6 mt-2 text-blue-700">Activities</h1>

      <!-- Corporation Selector -->
      <div class="mx-auto w-fit" v-if="store.isUserBoardPrelature">
        <MySelectCorporation v-model="currentCorpId" />
      </div>
    </div>
  </div>
</template>

<style scoped></style>
