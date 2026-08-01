import { createLeadSummary, validateLeadDraft } from './lead-draft.js';

export const INTEREST_OPTIONS = Object.freeze([
  Object.freeze({ id: 'online', title: 'Online prezentacija', detail: 'Kratka prezentacija BSS-a za vašu tvrtku.' }),
  Object.freeze({ id: 'live', title: 'Demonstracija uživo', detail: 'Pregled terminala i softvera na lokaciji.' }),
  Object.freeze({ id: 'pilot', title: 'Pilot projekt', detail: 'Rani interes za testiranje BSS-a u stvarnom radu.' })
]);

export function createConversionPanel({ onSelect, getProfile = () => ({}) } = {}) {
  const section = document.createElement('section');
  section.className = 'conversion-panel';
  section.setAttribute('aria-labelledby', 'conversionTitle');
  section.innerHTML = `
    <div>
      <p class="eyebrow">Sljedeći korak</p>
      <h3 id="conversionTitle">Želite li vidjeti BSS u svojoj tvrtki?</h3>
      <p>Odaberite vrstu interesa i pripremite lokalni nacrt zahtjeva. Portal ništa ne šalje niti trajno sprema.</p>
    </div>
    <div class="conversion-options"></div>
    <form class="lead-draft-form" novalidate>
      <label>Tvrtka<input name="company" autocomplete="organization" maxlength="100" required></label>
      <label>Kontakt osoba<input name="contact" autocomplete="name" maxlength="100" required></label>
      <label>E-mail<input name="email" type="email" autocomplete="email" maxlength="160" required></label>
      <button class="button primary" type="submit">Pripremi zahtjev</button>
    </form>
    <p class="conversion-feedback" role="status" aria-live="polite"></p>
    <textarea class="lead-summary hidden" readonly aria-label="Sažetak zahtjeva"></textarea>
    <button class="button secondary copy-lead hidden" type="button">Kopiraj sažetak</button>
  `;

  const options = section.querySelector('.conversion-options');
  const form = section.querySelector('.lead-draft-form');
  const feedback = section.querySelector('.conversion-feedback');
  const summary = section.querySelector('.lead-summary');
  const copyButton = section.querySelector('.copy-lead');
  let selectedInterest = '';

  for (const option of INTEREST_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'conversion-option';
    button.dataset.interest = option.id;
    button.innerHTML = `<strong>${option.title}</strong><span>${option.detail}</span>`;
    button.addEventListener('click', () => {
      selectedInterest = option.id;
      options.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      feedback.textContent = `Odabrano: ${option.title}. Unesite kontaktne podatke za lokalni nacrt.`;
      onSelect?.(option.id);
    });
    button.setAttribute('aria-pressed', 'false');
    options.append(button);
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(form));
    const result = validateLeadDraft({ ...values, interest: selectedInterest });

    if (!result.valid) {
      feedback.textContent = Object.values(result.errors)[0];
      summary.classList.add('hidden');
      copyButton.classList.add('hidden');
      return;
    }

    summary.value = createLeadSummary(result.draft, getProfile());
    summary.classList.remove('hidden');
    copyButton.classList.remove('hidden');
    feedback.textContent = 'Nacrt je pripremljen lokalno. Podaci nisu poslani niti spremljeni.';
  });

  copyButton.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(summary.value);
      feedback.textContent = 'Sažetak je kopiran u međuspremnik.';
    } catch {
      summary.focus();
      summary.select();
      feedback.textContent = 'Automatsko kopiranje nije dostupno. Tekst je označen za ručno kopiranje.';
    }
  });

  return section;
}
