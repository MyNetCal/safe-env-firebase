<script setup>
import { useGeneralStore } from '@/stores/general';
import { getDownloadURL, ref as storageRef } from '@firebase/storage';
import { useFirebaseStorage } from 'vuefire';


const store = useGeneralStore()
const storage = useFirebaseStorage()

function getCodeUrl() {
  getDownloadURL(storageRef(storage,`Corporations/${store.loginCorporationId}/Code`))
}
</script>

<template>
  <div class="h-full justify-between p-2" v-if="store.loginUser">
    <h1 class="select-none text-center">{{ store.loginUser.Nickname }} {{ store.loginUser.LastName }}</h1>
    <h2>{{ store.loginUser.Status }}</h2>
    <div class="mt-10">
      <div>
        Pending Tasks:
        <div v-if="!store.loginUserCorporation?.ScreeningReq?.Code">
          Please Read and Sign the Code of Conduct

        </div>
      </div>
    </div>
  </div>
</template>

<style scoped></style>
