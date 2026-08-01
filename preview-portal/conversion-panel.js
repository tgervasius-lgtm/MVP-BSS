export const INTEREST_OPTIONS = Object.freeze([
  Object.freeze({ id: 'online', title: 'Online prezentacija', detail: 'Kratka prezentacija BSS-a za vašu tvrtku.' }),
  Object.freeze({ id: 'live', title: 'Demonstracija uživo', detail: 'Pregled terminala i softvera na lokaciji.' }),
  Object.freeze({ id: 'pilot', title: 'Pilot projekt', detail: 'Rani interes za testiranje BSS-a u stvarnom radu.' })
]);

export function createConversionPanel({ onSelect } = {}) {
  const section = document.createElement('section');
  section.className = 'conversion-panel';
  section.setAttribute('aria-labelledby', 'conversionTitle');
  section.innerHTML = `
    <div>
      <p class="eyebrow">Sljedeći korak</p>
      <h3 id="conversionTitle">Želite li vidjeti BSS u svojoj tvrtki?</h3>
      <p>Odaberite vrstu interesa. Ovo je lokalna simulacija i još ne šalje osobne podatke.</p>
    </div>
    <div class="conversion-options"></div>
    <p class="conversion-feedback" role="status" aria-live="polite"></p>
  `;

  const options = section.querySelector('.conversion-options');
  const feedback = section.querySelector('.conversion-feedback');

  for (const option of INTEREST_OPTIONS) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'conversion-option';
    button.dataset.interest = option.id;
    button.innerHTML = `<strong>${option.title}</strong><span>${option.detail}</span>`;
    button.addEventListener('click', () => {
      options.querySelectorAll('button').forEach((item) => item.setAttribute('aria-pressed', 'false'));
      button.setAttribute('aria-pressed', 'true');
      feedback.textContent = `Odabrano: ${option.title}. Kontaktni obrazac bit će povezan tek kada odobrimo način obrade podataka.`;
      onSelect?.(option.id);
    });
    button.setAttribute('aria-pressed', 'false');
    options.append(button);
  }

  return section;
}
