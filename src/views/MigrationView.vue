<template>
  <div class="p-6">
    <h1 class="text-2xl font-bold mb-4">Data Migration Utility</h1>

    <div class="bg-yellow-50 border border-yellow-200 rounded p-4 mb-4">
      <h2 class="font-semibold text-yellow-800">⚠️ One-Time Migration Required</h2>
      <p class="text-yellow-700 mt-2">
        This tool adds Branch fields to existing Corporations, Participants, and Sites
        that don't have them. This ensures compatibility with the new multi-section system.
      </p>
    </div>

    <div v-if="!isRunning && !isComplete" class="bg-blue-50 border border-blue-200 rounded p-4">
      <button
        @click="runMigration"
        class="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        :disabled="isRunning"
      >
        🚀 Run Migration
      </button>
      <p class="text-blue-700 mt-2 text-sm">
        This will update all existing records to include Branch fields. Safe to run multiple times.
      </p>
    </div>

    <div v-if="isRunning" class="bg-orange-50 border border-orange-200 rounded p-4">
      <div class="flex items-center">
        <div class="animate-spin rounded-full h-6 w-6 border-b-2 border-orange-600 mr-3"></div>
        <span class="text-orange-800">Running migration... {{ progress }}</span>
      </div>
    </div>

    <div v-if="isComplete" class="bg-green-50 border border-green-200 rounded p-4">
      <div class="flex items-center mb-2">
        <span class="text-green-600 text-xl mr-2">✅</span>
        <span class="text-green-800 font-semibold">Migration Complete!</span>
      </div>
      <p class="text-green-700">{{ results }}</p>
    </div>

    <div v-if="error" class="bg-red-50 border border-red-200 rounded p-4 mt-4">
      <div class="flex items-center">
        <span class="text-red-600 text-xl mr-2">❌</span>
        <span class="text-red-800 font-semibold">Migration Failed</span>
      </div>
      <p class="text-red-700 mt-2">{{ error }}</p>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { migrateBranchFields } from '@/migration-branch.js'

const isRunning = ref(false)
const isComplete = ref(false)
const progress = ref('')
const results = ref('')
const error = ref('')

const runMigration = async () => {
  try {
    isRunning.value = true
    isComplete.value = false
    error.value = ''
    progress.value = 'Starting migration...'
    results.value = ''

    // Override console.log to capture progress
    const originalLog = console.log
    console.log = (message) => {
      progress.value = message
      originalLog(message)
    }

    await migrateBranchFields()

    isRunning.value = false
    isComplete.value = true
    results.value = 'All existing records have been successfully updated with Branch fields.'
    progress.value = ''

    // Restore console.log
    console.log = originalLog

  } catch (err) {
    isRunning.value = false
    error.value = err.message || 'An error occurred during migration'
    console.error('Migration error:', err)
  }
}
</script>