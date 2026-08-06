(function enableStablePublicDemoLogin(root){
  'use strict';

  const credentials=Object.freeze({email:'demo@bss.hr',password:'useruser'});
  const originalLogin=typeof root.login==='function'?root.login.bind(root):null;
  let configuring=false;

  function configureLogin(){
    if(configuring)return;
    const section=root.document?.querySelector('#login');
    if(!section)return;
    const inputs=[...section.querySelectorAll('input')];
    const identity=inputs[0];
    const password=inputs[1];
    const button=section.querySelector('.primary-login');
    if(!identity||!password||!button)return;

    configuring=true;
    identity.id='loginIdentity';
    identity.name='username';
    identity.type='text';
    identity.autocomplete='username';
    identity.autocapitalize='none';
    identity.spellcheck=false;
    identity.removeAttribute('pattern');
    identity.removeAttribute('required');
    identity.removeAttribute('minlength');
    identity.value=credentials.email;

    password.id='loginPassword';
    password.name='password';
    password.autocomplete='current-password';
    password.removeAttribute('pattern');
    password.removeAttribute('required');
    password.removeAttribute('minlength');
    password.value=credentials.password;

    button.type='button';
    button.setAttribute('aria-describedby','demoCredentials');

    let panel=section.querySelector('#demoCredentials');
    if(!panel){
      panel=root.document.createElement('div');
      panel.id='demoCredentials';
      panel.className='demo-credentials';
      panel.setAttribute('aria-label','Podaci za javni demo pristup');
      panel.innerHTML=`<div><span>Email</span><b>${credentials.email}</b></div><div><span>Lozinka</span><b>${credentials.password}</b></div><p>Javni demo: podaci su već upisani. Samo klikni „Uđi u BSS”.</p>`;
      const loginRow=section.querySelector('.login-row');
      loginRow?.before(panel);
    }
    configuring=false;
  }

  function enterDemo(){
    if(root.BSS_API_ACTIVE)return false;
    configureLogin();
    if(typeof originalLogin!=='function')return false;
    originalLogin();
    return true;
  }

  root.login=enterDemo;
  root.BSSDemoAccess=Object.freeze({credentials,enter:enterDemo,configure:configureLogin});

  root.document?.addEventListener('click',event=>{
    if(root.BSS_API_ACTIVE)return;
    const target=event.target instanceof root.Element?event.target:null;
    const button=target?.closest('#login .primary-login');
    if(!button)return;
    event.preventDefault();
    event.stopImmediatePropagation();
    enterDemo();
  },true);

  root.document?.addEventListener('keydown',event=>{
    if(root.BSS_API_ACTIVE)return;
    if(event.key!=='Enter')return;
    const target=event.target instanceof root.Element?event.target:null;
    if(!target?.closest('#login'))return;
    event.preventDefault();
    event.stopImmediatePropagation();
    enterDemo();
  },true);

  const rootNode=root.document?.querySelector('#root');
  if(rootNode&&typeof root.MutationObserver==='function'){
    new root.MutationObserver(configureLogin).observe(rootNode,{childList:true,subtree:true});
  }
  configureLogin();
})(typeof globalThis==='object'?globalThis:window);
