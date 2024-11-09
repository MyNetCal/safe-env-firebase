<script setup>
import MyButton from '@/components/MyButton.vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import { Dialog, DialogPanel, DialogTitle } from '@headlessui/vue'
import { watch } from 'vue'

const model = defineModel()

watch(model, () => {
  if (model.value) {
    // 
  } else {
    // 
  }
})
</script>

<template>
  <div>
    <Dialog :open="model" @close="model = false" class="relative z-50">
      <DialogPanel class="my-dialog">
        <div class="my-dialog-overlay" />
        <div class="my-dialog-outer">
          <div class="my-dialog-inner">
            <DialogTitle class="my-dialog-title">
              Add Initial Training Requirement
              <FontAwesomeIcon @click="model = false" class="" icon="times" />
            </DialogTitle>
            <div class="my-dialog-content"></div>
            <div class="my-dialog-buttons">
              <MyButton @click="model = false">Close</MyButton>
              <MyButton @click="model = false">Save</MyButton>
            </div>
          </div>
        </div>
      </DialogPanel>
    </Dialog>
  </div>
</template>

<style scoped></style>
