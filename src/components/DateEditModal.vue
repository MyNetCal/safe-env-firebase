<template>
  <div>
    <MyModal
      :showModal="showModal"
      title="Endter Date"
      @onClose="$emit('onClose')"
      @onOpenModal="onOpenModal()"
      maxWidth="max-w-md"
    >
      <div>
        <div class="mt-10">
            Training completion date
            <MyInputText></MyInputText>
        </div>
        <!-- Buttons -->
        <div class="mt-2 flex justify-center">
          <MyButton @delete="onDelete" color="bg-red-600"> Delete </MyButton>
          <MyButton @click="$emit('onClose')" color="bg-blue-600">
            Close
          </MyButton>
          <MyButton @click="onSave" color="bg-green-600"> Save </MyButton>
        </div>
      </div>
    </MyModal>
  </div>
</template>

<script setup>
import MyModal from "@/components/MyModal.vue";
import MyButton from "@/components/MyButton.vue";
import { toRefs } from "vue";
import MyInputText from "./MyInputs/MyInputText.vue";

const emit = defineEmits(["onClose", "onUpdate"]);
const props = defineProps({ showModal: Boolean, stDate: String });
const { showModal, stDate } = toRefs(props);

function onOpenModal() {

  console.log("oppening Modal: ", stDate.value);
}

function onDelete() {
  console.log("Deleteing");
  emit("onUpdate");
}

function onSave() {
  console.log("Saving");
  emit("onUpdate");
}
</script>

<style scoped></style>
