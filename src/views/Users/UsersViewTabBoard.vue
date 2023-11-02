<script setup>
import { useGeneralStore } from '@/stores/general'
import { collection } from 'firebase/firestore'
import { computed } from 'vue'
import { useCollection, useFirestore } from 'vuefire'

const db = useFirestore()

const store = useGeneralStore()

console.log(store.ENTITY_BOTH)

const personnel = useCollection(collection(db, 'UsersCorporations'))

const personnelBoard = computed(() =>
  personnel.value.length > 0
    ? personnel.value.filter((c) => c.Board || c.Screening)
    : []
)
</script>

<template>
  <div>
    <h1>Board</h1>
    <div>
      <div v-for="personnel in personnelBoard" :key="personnel.id">
        {{ personnelBoard.Nickname }}
      </div>
    </div>
  </div>
</template>

<style scoped></style>
