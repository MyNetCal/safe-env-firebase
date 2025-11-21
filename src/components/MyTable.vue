<template>
  <div>
    <table class="w-full">
      <thead>
        <tr>
          <th
            class="sticky top-0 border-b border-gray-100 bg-gray-200 py-1 pl-2 pr-8 text-left font-bold"
            v-for="(header, i) of headers"
            :key="i"
          >
            {{ header }}
            <span
              v-if="fieldsKey[i].filter"
              class="relative float-right inline-block cursor-pointer pl-2"
            >
              <font-awesome-icon
                icon="filter"
                @click="fieldsKey[i].filter"
                :class="fieldsKey[i].filterColorClass"
              />
            </span>
          </th>
        </tr>
      </thead>

      <my-table-rows
        class="text-sm hover:text-gray-900"
        :class="[inThePast(row) ? 'text-gray-300' : 'text-gray-700']"
        v-for="(row, index) of rows"
        :key="row.id"
        :row="row"
        :fields="fieldsKey"
        :index="index"
        :data-name="dataName"
        :data-name-index="dataNameIndex"
        :data-name-index-name="dataNameIndexName"
        :active-rows="activeRows"
        :delete-icon="deleteIcon"
        @on-reorder="emitNewOrder"
        @on-click="$emit('onClick', { rowInfo: row, rowIndex: index })"
        @on-delete-icon="onDeletingIcon"
        :icon-options="iconOptions"
      >
      </my-table-rows>
    </table>
  </div>
</template>

<script>
import MyTableRows from './MyTableRows.vue'
export default {
  components: { MyTableRows },
  props: {
    fields: {
      /*
        [ 
          key: "", 
          label:"", 
          format: (cell, row, index) => {
            return ""
          }, 
          icon: (cell, row) => { 
            return {
              icon: iconName,
              text: text besides icon,
              aligned: default is text-left
              colorClass: as text-blue-600
            }
          }
        ]
      */
      type: Array
    },
    rows: Array,
    dataName: String,
    dataNameIndex: Number,
    dataNameIndexName: String,
    activeRows: String,
    inThePast: {
      type: Function,
      default: () => {
        return false
      }
    },
    deleteIcon: {
      type: Boolean,
      default: false
    },
    iconOptions: {
      type: Array,
      default: () => []
      /*      
      [
        {
          icon: '',
          f: (index, indexIcon, event)=>{},
          class: 'text-blue-800'
        }
      ]
 */
    }
  },
  emits: ['onReorder', 'onClick', 'onDeleteIcon'],
  data() {
    return { count: 4 }
  },
  computed: {
    headers() {
      return this.fields.map((header) => header.label)
    },
    fieldsKey() {
      return this.fields.map((field) => {
        return { filter: false, ...field }
      })
    }
  },

  methods: {
    emitNewOrder(newOrder) {
      this.$emit('onReorder', newOrder)
    },
    onDeletingIcon(infoRow) {
      this.$emit('onDeleteIcon', infoRow)
    }
  }
}
</script>

<style></style>
