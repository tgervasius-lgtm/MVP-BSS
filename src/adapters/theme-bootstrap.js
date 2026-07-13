(function bootstrapTheme(root){
  'use strict';

  const fallback = 'light';
  try{
    const runtimeStorage=root.BSSCore?.runtime?.storage;
    const saved=runtimeStorage?.get('bss-theme-v1') ?? root.localStorage?.getItem('bss-theme-v1');
    const prefersDark=typeof root.matchMedia==='function' && root.matchMedia('(prefers-color-scheme: dark)').matches;
    root.document.documentElement.dataset.theme=['light','dark'].includes(saved)?saved:(prefersDark?'dark':fallback);
  }catch{
    if(root.document?.documentElement)root.document.documentElement.dataset.theme=fallback;
  }
})(typeof globalThis==='object'?globalThis:window);
