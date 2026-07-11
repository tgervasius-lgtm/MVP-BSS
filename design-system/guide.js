'use strict';

const BSS_THEME_KEY = 'bss-theme-v1';

function designSystemTheme(){
  return document.documentElement.dataset.theme === 'dark' ? 'dark' : 'light';
}

function updateDesignSystemTheme(){
  const dark = designSystemTheme() === 'dark';
  const control = document.querySelector('[data-theme-switch]');
  const meta = document.querySelector('meta[name="theme-color"]');
  if(control) control.setAttribute('aria-checked',String(dark));
  const label = document.querySelector('[data-theme-label]');
  const icon = document.querySelector('[data-theme-icon]');
  if(label) label.textContent = dark ? 'Svijetla tema' : 'Tamna tema';
  if(icon) icon.textContent = dark ? '☀' : '☾';
  if(meta) meta.setAttribute('content',dark ? '#071b17' : '#0f766e');
}

function toggleDesignSystemTheme(){
  const next = designSystemTheme() === 'dark' ? 'light' : 'dark';
  document.documentElement.dataset.theme = next;
  localStorage.setItem(BSS_THEME_KEY,next);
  updateDesignSystemTheme();
}

document.querySelector('[data-theme-switch]')?.addEventListener('click',toggleDesignSystemTheme);
updateDesignSystemTheme();

const sections = [...document.querySelectorAll('main section[id]')];
const links = [...document.querySelectorAll('.ds-nav a')];
if('IntersectionObserver' in window){
  const observer = new IntersectionObserver(entries=>{
    const active = entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!active) return;
    links.forEach(link=>link.setAttribute('aria-current',String(link.hash===`#${active.target.id}`)));
  },{rootMargin:'-18% 0px -68%',threshold:[0,.2,.6]});
  sections.forEach(section=>observer.observe(section));
}
