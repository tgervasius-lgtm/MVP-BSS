import js from '@eslint/js';
import globals from 'globals';

const strictRules={
  'no-undef':'error',
  'no-unused-vars':['error',{argsIgnorePattern:'^_',caughtErrorsIgnorePattern:'^_'}]
};

export default [
  {
    ignores:[
      '**/node_modules/**',
      '**/dist/**',
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
  },
  {
    files:['eslint.config.mjs','scripts/**/*.mjs'],
    languageOptions:{sourceType:'module',globals:globals.node},
    rules:strictRules
  },
  {
    files:['playwright.config.cjs','tests/**/*.cjs'],
    languageOptions:{sourceType:'commonjs',globals:{...globals.node,...globals.browser}},
    rules:strictRules
  },
  {
    files:['brand-book/**/*.js','design-system/**/*.js'],
    languageOptions:{globals:globals.browser},
    rules:strictRules
  },
  {
    files:['src/**/*.js'],
    ignores:['src/adapters/api-bindings.js'],
    languageOptions:{globals:{...globals.browser,module:'readonly'}},
    rules:strictRules
  },
  {
    files:['sw.js'],
    languageOptions:{globals:{...globals.browser,...globals.serviceworker}},
    rules:strictRules
  }
];
