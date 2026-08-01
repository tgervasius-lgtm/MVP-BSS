import { INITIAL_STATE, startDemo, registerEmployee, resetDemo } from './state.js';

let state = { ...INITIAL_STATE };
const byId = (id) => document.getElementById(id);
const elements = {
  welcome: byId('welcomeView'),
  demo: byId('demoView'),
  start: byId('startButton'),
  reset: byId('resetButton'),
  scan: byId('scanButton'),
  count: byId('presentCount'),
  screen: byId('terminalScreen'),
  feed: byId('activityFeed'),
  objective: byId('objectiveText'),
  status: byId('objectiveStatus')
};

function render() {
  elements.welcome.classList.toggle('hidden', state.started);
  elements.demo.classList.toggle('hidden', !state.started);
  elements.count.textContent = String(state.presentCount);

  if (state.scanned) {
    elements.screen.classList.add('success');
    elements.screen.innerHTML = '<span class="terminal-icon">✓</span><strong>Dobro došli, Ivan Horvat</strong><small>07:01 · Prijava evidentirana</small>';
    elements.scan.disabled = true;
    elements.scan.textContent = 'Prijava je evidentirana';
    elements.objective.textContent = 'Zadatak je završen. Dashboard je ažuriran u stvarnom vremenu.';
    elements.status.textContent = 'Završeno';
    elements.status.classList.add('complete');

    if (!byId('ivanEvent')) {
      const event = document.createElement('li');
      event.id = 'ivanEvent';
      event.innerHTML = '<span>07:01</span> Ivan Horvat se prijavio putem RFID terminala.';
      elements.feed.append(event);
    }
  } else {
    elements.screen.classList.remove('success');
    elements.screen.innerHTML = '<span class="terminal-icon">RFID</span><strong>Spremno za prijavu</strong><small>Terminal: Ulaz proizvodnja</small>';
    elements.scan.disabled = false;
    elements.scan.textContent = 'Simuliraj karticu Ivana Horvata';
    elements.objective.textContent = 'Otvorite virtualni terminal i evidentirajte dolazak Ivana Horvata.';
    elements.status.textContent = 'U tijeku';
    elements.status.classList.remove('complete');
    byId('ivanEvent')?.remove();
  }
}

elements.start.addEventListener('click', () => {
  state = startDemo(state);
  render();
});

elements.scan.addEventListener('click', () => {
  state = registerEmployee(state);
  render();
});

elements.reset.addEventListener('click', () => {
  state = resetDemo();
  render();
});

render();
