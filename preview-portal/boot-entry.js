import { createBootExperience } from './boot-experience.js';

const styles = document.createElement('link');
styles.rel = 'stylesheet';
styles.href = 'boot-experience.css';
document.head.append(styles);

const boot = createBootExperience();
const form = document.getElementById('profileForm');
let bypassBoot = false;

form?.addEventListener('submit', async (event) => {
  if (bypassBoot) {
    bypassBoot = false;
    return;
  }

  event.preventDefault();
  event.stopImmediatePropagation();
  const started = await boot.run();
  if (!started) return;

  bypassBoot = true;
  form.requestSubmit();
}, { capture: true });

document.getElementById('resetButton')?.addEventListener('click', () => boot.reset());
document.getElementById('restartButton')?.addEventListener('click', () => boot.reset());
