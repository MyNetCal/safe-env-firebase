<template>
  <div class="mb-4 w-full pt-0">
    <MyInfoModal :info="info" :infoTitle="infoTitle" :label="label">
      <slot></slot>
    </MyInfoModal>
    <Combobox
      :multiple="isMultiple"
      :modelValue="modelValue"
      @update:modelValue="(value) => emit('update:modelValue', value)"
    >
      <div class="relative">
        <div class="relative w-full">
          <div
            v-if="isMultiple"
            class="input-ring relative w-full rounded border-0 bg-white px-2 py-2 text-sm outline-none ring-1 ring-red-800 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
          >
            <div
              class="mr-4 flex h-5 min-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap"
            >
              <div v-for="activity in items" :key="activity.id">
                <div v-if="modelValue.find((el) => el.id == activity.id)">
                  <FontAwesomeIcon icon="circle" class="ml-1 mr-1 text-gray-500" size="2xs" />
                  <span>{{ activity.Name }}</span>
                </div>
              </div>
            </div>
            <ComboboxButton
              class="input-ring absolute inset-y-0 left-0 right-0 flex items-center justify-end pr-2"
            >
              <FontAwesomeIcon icon="chevron-right" />
            </ComboboxButton>
          </div>
          <div v-else>
            <ComboboxInput
              ref="target"
              autocomplete="off"
              class="input-ring relative w-full rounded border-0 bg-white py-2 pl-2 pr-6 text-sm outline-none ring-1 placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
              :class="[isError.formula ? 'ring-red-500' : '']"
              @change="query = $event.target.value"
              @focus="query = ''"
              :displayValue="(item) => (itemsLabel ? item[itemsLabel] : item)"
            />
            <ComboboxButton
              class="absolute inset-y-0 left-0 right-0 flex items-center justify-end pr-2"
            >
              <FontAwesomeIcon icon="chevron-right" />
            </ComboboxButton>
          </div>
        </div>
        <Transition
          enter-active-class="transition duration-100 ease-out"
          enter-from-class="transform scale-95 opacity-0"
          enter-to-class="transform scale-100 opacity-100"
          leave-active-class="transition duration-75 ease-out"
          leave-from-class="transform scale-100 opacity-100"
          leave-to-class="transform scale-95 opacity-0"
        >
          <ComboboxOptions
            class="thinsb absolute z-10 w-full overflow-auto rounded-md bg-white py-1 text-left text-base shadow-lg ring-1 ring-blue-300 focus:outline-none sm:text-sm"
            v-bind="$attrs"
          >
            <ComboboxOption
              v-if="queryItem"
              :value="queryItem"
              class="p-2 ui-selected:bg-blue-200 ui-active:bg-blue-500 ui-active:text-white ui-not-active:text-black"
            >
              <div class="flex">
                <div class="w-5"></div>
                * {{ query }}
              </div>
            </ComboboxOption>
            <ComboboxOption
              v-for="item in filteredItems"
              :key="item[itemsKey] || item"
              :value="item"
              v-slot="{ selected }"
              class="p-2 ui-selected:bg-blue-200 ui-active:bg-blue-500 ui-active:text-white ui-not-active:text-black"
            >
              <div class="flex">
                <div class="w-5"><FontAwesomeIcon v-if="selected" icon="check" /></div>
                {{ itemsLabel ? item[itemsLabel] : item }}
              </div>
            </ComboboxOption>
          </ComboboxOptions>
        </Transition>
      </div>
    </Combobox>
    <div v-if="isError.formula" class="absolute text-xs text-red-500">
      {{ isError.label }}
    </div>
  </div>
</template>

<script setup>
import { ref, computed, toRefs } from 'vue'
import {
  Combobox,
  ComboboxInput,
  ComboboxButton,
  ComboboxOptions,
  ComboboxOption
} from '@headlessui/vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'
import MyInfoModal from './MyInfoModal.vue'

const props = defineProps({
  modelValue: {},
  label: { type: String, default: '' },
  info: { type: Boolean, default: false },
  infoTitle: { type: String, default: '' },
  items: Array,
  itemsKey: { type: String, default: 'id' },
  itemsLabel: { type: String, default: null },
  isError: {
    type: Object,
    default: () => {
      return { formula: false, label: '' }
    }
  },
  isMultiple: { type: Boolean, default: false },
  customValues: { type: Boolean, default: false }
})
const { items, itemsLabel, itemsKey, label } = toRefs(props)
const emit = defineEmits(['update:modelValue'])

const query = ref('')

const queryItem = computed(() => {
  return query.value === '' ? null : { [itemsKey.value]: null, [itemsLabel.value]: query.value }
})

const filteredItems = computed(() =>
  query.value === ''
    ? items.value
    : items.value.filter((item) => {
        return itemsLabel.value
          ? item[itemsLabel.value].toLowerCase().includes(query.value.toLowerCase())
          : item.toLowerCase().includes(query.value.toLowerCase())
      })
)
</script>
