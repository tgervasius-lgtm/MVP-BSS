import js from '@eslint/js';

export default [
  {
    ignores:[
      'node_modules/**',
      'dist/**',
      'output/**',
      'playwright-report/**',
      'test-results/**',
      'tmp/**'
    ]
  },
  {
    files:['**/*.js','**/*.cjs','**/*.mjs'],
    languageOptions:{
      ecmaVersion:'latest',
      sourceType:'script'
    },
    linterOptions:{
      reportUnusedDisableDirectives:'error'
    },
    rules:{
      ...js.configs.recommended.rules,
      'no-undef':'off',
      'no-unused-vars':'off',
      'no-eval':'error',
      'no-implied-eval':'error',
      'no-new-func':'error'
    }
  },
  {
    files:['**/*.mjs'],
    languageOptions:{sourceType:'module'}
  }
];
