<template>
  <div class="relative mb-4 pt-0">
    <my-info-modal label="Branch"><slot></slot> </my-info-modal>

    <div class="divide-x rounded border-gray-400 bg-white shadow">
      <!-- Men option -->
      <button
        class="rounded-l px-5 pt-2 pb-1"
        @click="$emit('update:modelValue', 'Men')"
        :class="{
          'bg-blue-300': modelValue == 'Men',
          'hover:bg-blue-100': modelValue != 'Men'
        }"
      >
        <font-awesome-icon icon="male" class="text-blue-700"></font-awesome-icon>
      </button>

      <!-- Women option -->
      <button
        class="px-4 pt-2 pb-1"
        :class="{
          'bg-pink-300': modelValue == 'Women',
          'hover:bg-pink-100': modelValue != 'Women',
          'rounded-r': noBothOption
        }"
        @click="$emit('update:modelValue', 'Women')"
      >
        <font-awesome-icon icon="female" class="text-pink-600" />
      </button>

      <!-- Both option -->
      <button
        v-if="!noBothOption"
        class="rounded-r px-4 pt-2 pb-1"
        @click="$emit('update:modelValue', 'Both')"
        :class="{
          'bg-purple-300': modelValue == 'Both',
          'hover:bg-purple-100': modelValue != 'Both'
        }"
      >
        <font-awesome-icon icon="male" class="text-blue-700" />
        <font-awesome-icon icon="female" class="text-pink-600" />
      </button>
    </div>
    <div v-if="isError.formula" class="absolute text-xs text-red-500">
      {{ isError.label }}
    </div>
  </div>
</template>

<script>
import MyInfoModal from './MyInfoModal.vue'
export default {
  components: { MyInfoModal },
  props: {
    modelValue: String,
    noBothOption: { type: Boolean, default: false },
    isError: {
      type: Object,
      default: () => {
        return { formula: false, label: '' }
      }
    }
  },
  emits: ['update:modelValue']
}
</script>
