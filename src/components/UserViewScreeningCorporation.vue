<script setup>
import { toRefs } from 'vue'
import UserViewScreeningCorpItem from './UserViewScreeningCorpItem.vue';

const props = defineProps({ corporation: Object, user: Object })
const { corporation, user } = toRefs(props)

</script>

<template>
  <div>
    <UserViewScreeningCorpItem :corporation="corporation" :user="user" item="Application"/>
    <UserViewScreeningCorpItem :corporation="corporation" :user="user" item="Interview"/>
    <UserViewScreeningCorpItem :corporation="corporation" :user="user" item="Reference"/>
    <UserViewScreeningCorpItem :corporation="corporation" :user="user" item="Background"/>
    <UserViewScreeningCorpItem :corporation="corporation" :user="user" item="Code"/>
    <UserViewScreeningCorpItem :corporation="corporation" :user="user" item="Consent"/>
  </div>
</template>

<style scoped></style>
