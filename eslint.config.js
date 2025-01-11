import globals from "globals";
import pluginJs from "@eslint/js";
import pluginVue from "eslint-plugin-vue";
// import skipFormatting from '@vue/eslint-config-prettier/skip-formatting'


export default [
  { languageOptions: { globals: globals.browser } },
  {
    name: 'app/files-to-lint',
    files: ['**/*.{js,mjs,jsx,vue}'],
  },

  {
    name: 'app/files-to-ignore',
    ignores: ['**/dist/**', '**/dist-ssr/**', '**/coverage/**', '**/dev-dist/**'],
  },

  pluginJs.configs.recommended,
  ...pluginVue.configs["flat/essential"],
  // skipFormatting,
];