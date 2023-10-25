<template>
  <Listbox
    :modelValue="modelValue"
    @update:modelValue="(value) => emit('update:modelValue', value)"
    by="id"
  >
    <div class="relative w-fit">
      <ListboxButton
        class="relative flex w-full place-items-center justify-between truncate rounded border-0 py-1 pl-2 pr-2 text-sm outline-none placeholder:text-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-300"
        v-slot="{ open }"
      >
        {{ title ? modelValue[title] : modelValue }}
        <FontAwesomeIcon :icon="open ? 'caret-down' : 'caret-right'" />
      </ListboxButton>
      <Transition
        enter-active-class="transition duration-100 ease-out"
        enter-from-class="transform scale-95 opacity-0"
        enter-to-class="transform scale-100 opacity-100"
        leave-active-class="transition duration-75 ease-out"
        leave-from-class="transform scale-100 opacity-100"
        leave-to-class="transform scale-95 opacity-0"
      >
        <ListboxOptions
          as="div"
          class="absolute z-10 mt-2 w-full overflow-auto rounded-md bg-white py-1 text-left text-base shadow-lg ring-1 ring-blue-300 focus:outline-none sm:text-sm"
        >
          <!-- Use the `active` state to conditionally style the active option. -->
          <!-- Use the `selected` state to conditionally style the selected option. -->
          <ListboxOption
            v-for="item in items"
            :key="item.id"
            :value="item"
            as="div"
            class="p-2 ui-selected:bg-blue-200 ui-active:bg-blue-500 ui-active:text-white ui-not-active:text-black"
          >
            {{ title ? item[title] : item }}
          </ListboxOption>
        </ListboxOptions>
      </Transition>
    </div>
  </Listbox>
</template>

<script setup>
import { toRefs } from 'vue'
import { Listbox, ListboxButton, ListboxOptions, ListboxOption } from '@headlessui/vue'
import { FontAwesomeIcon } from '@fortawesome/vue-fontawesome'

const props = defineProps({ items: Array, modelValue: { default: null }, title: String })
const { items, title } = toRefs(props)
const emit = defineEmits(['update:modelValue'])
</script>
