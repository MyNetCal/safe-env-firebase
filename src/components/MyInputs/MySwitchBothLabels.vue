<template>
  <SwitchGroup>
    <div class="flex place-items-center items-center justify-center">
      <div class="flex place-items-center">
        <SwitchLabel
          class="cursor-pointer rounded-md px-3 py-1"
          :class="[modelValue ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-50']"
          ><slot name="left"></slot>
        </SwitchLabel>
        <Switch
          @update:modelValue="(n) => emit('update:modelValue', n)"
          class="relative mx-2 inline-flex h-6 w-11 items-center rounded-full bg-slate-400"
        >
          <span
            class="inline-block h-4 w-4 transform rounded-full bg-white transition ui-checked:translate-x-6 ui-not-checked:translate-x-1"
          ></span>
        </Switch>
        <SwitchLabel
          ><div
            class="cursor-pointer rounded-md px-2 py-1"
            :class="[!modelValue ? 'bg-slate-200 text-slate-600' : 'bg-slate-700 text-slate-50']"
          >
            <slot></slot>
            <slot name="right"></slot>
          </div>
        </SwitchLabel>
      </div>
    </div>
  </SwitchGroup>
</template>

<script setup>
import { Switch, SwitchGroup, SwitchLabel } from '@headlessui/vue'

defineProps({ modelValue: Boolean })
const emit = defineEmits(['update:modelValue'])
</script>

<style scoped></style>
