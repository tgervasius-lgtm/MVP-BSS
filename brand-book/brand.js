'use strict';

const BRAND_THEME_KEY='bss-theme-v1';
function brandTheme(){return document.documentElement.dataset.theme==='dark'?'dark':'light';}
function updateBrandTheme(){
  const dark=brandTheme()==='dark',control=document.querySelector('[data-theme-switch]');
  control?.setAttribute('aria-checked',String(dark));
  const label=document.querySelector('[data-theme-label]'),icon=document.querySelector('[data-theme-icon]');
  if(label)label.textContent=dark?'Svijetla tema':'Tamna tema';
  if(icon)icon.textContent=dark?'☀':'☾';
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content',dark?'#062a26':'#0f766e');
}
function toggleBrandTheme(){
  document.documentElement.dataset.theme=brandTheme()==='dark'?'light':'dark';
  localStorage.setItem(BRAND_THEME_KEY,brandTheme());
  updateBrandTheme();
}
document.querySelector('[data-theme-switch]')?.addEventListener('click',toggleBrandTheme);
updateBrandTheme();

const links=[...document.querySelectorAll('.bb-nav a')],sections=[...document.querySelectorAll('main section[id]')];
if('IntersectionObserver'in window){
  const observer=new IntersectionObserver(entries=>{
    const active=entries.filter(entry=>entry.isIntersecting).sort((a,b)=>b.intersectionRatio-a.intersectionRatio)[0];
    if(!active)return;
    links.forEach(link=>link.setAttribute('aria-current',String(link.hash===`#${active.target.id}`)));
  },{rootMargin:'-22% 0px -68%',threshold:[0,.2,.55]});
  sections.forEach(section=>observer.observe(section));
}
