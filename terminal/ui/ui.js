/* Local synthetic controls; credentials and RFID UIDs never enter the browser. */
'use strict';
const element = id => document.getElementById(id);
let token = '';
let eventType = 'check_in';
let paused = false;
let attempt = null;
let busy = false;
const statuses = {synced:'Prihvaćeno u BSS-u', duplicate:'Već prihvaćeno u BSS-u', queued:'Čeka slanje',
  rejected:'Odbijeno — provjerite u BSS-u', reconciliation_required:'Potrebna administratorska provjera',
  interrupted:'Lokalni upis prekinut — potrebna provjera', preparing:'Upis u tijeku'};
const connections = {waiting:'Provjera veze', online:'API dostupan', offline:'API nedostupan', paused:'Sinkronizacija isključena',
  auth_error:'Provjerite pristup uređaja', storage_error:'Provjerite lokalni red'};
function feedback(text, state='') {
  element('feedback').textContent = text;
  element('feedback').dataset.state = state;
}
async function refresh() {
  try {
    const response = await fetch('/state', {cache:'no-store'});
    if (!response.ok) throw new Error('state');
    const state = await response.json();
    token = state.token; paused = state.paused;
    if (!element('card').options.length) state.cards.forEach((name, index) => {
      const option = document.createElement('option'); option.value = index; option.textContent = name;
      element('card').appendChild(option);
    });
    element('tap').disabled = busy;
    element('connection').textContent = connections[state.connection] || 'Provjera veze';
    element('network').textContent = paused ? 'Uključi sinkronizaciju' : 'Isključi sinkronizaciju';
    element('network').setAttribute('aria-pressed', String(paused));
    element('queue').textContent = `Na čekanju: ${state.counts.queued || 0}`;
    const attention = (state.counts.rejected || 0) + (state.counts.reconciliation_required || 0) + (state.counts.interrupted || 0);
    element('result').textContent = state.latest ? `Događaj ${state.latest.sequence}: ${statuses[state.latest.status] || 'Provjera ishoda'}. Za provjeru ukupno: ${attention}.` : 'Još nema događaja.';
  } catch {
    element('tap').disabled = true;
    element('connection').textContent = 'Lokalni program nije dostupan';
  }
}
async function post(path, value) {
  const response = await fetch(path, {method:'POST', headers:{'Content-Type':'application/json','X-BSS-Local-Token':token}, body:JSON.stringify(value)});
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Zahtjev nije potvrđen.');
  return result;
}
for (const [id, type] of [['arrival','check_in'],['departure','check_out']]) {
  element(id).addEventListener('click', () => {
    if (busy || attempt) return;
    eventType = type;
    element('arrival').setAttribute('aria-pressed', String(type === 'check_in'));
    element('departure').setAttribute('aria-pressed', String(type === 'check_out'));
  });
}
element('tap').addEventListener('click', async () => {
  if (busy) return;
  busy = true; element('tap').disabled = true;
  // A lost local response retries the same immutable attempt, even if controls change.
  attempt ||= {card:Number(element('card').value), eventType, requestId:crypto.randomUUID(), trustedFixtureClock:element('trusted').checked};
  try {
    const result = await post('/capture', attempt);
    feedback(`Događaj ${result.sequence} spremljen na uređaju.${result.clockStatus === 'uncertain' ? ' Vrijeme zahtijeva provjeru.' : ''}`, 'ok');
    attempt = null; element('tap').textContent = 'Prisloni testnu karticu';
  } catch (error) {
    feedback(`${error.message} Ponovite isti pokušaj.`, 'error');
    element('tap').textContent = 'Ponovi isti pokušaj';
  } finally {
    busy = false; await refresh();
  }
});
element('network').addEventListener('click', async () => {
  try { await post('/connection', {paused:!paused}); await refresh(); }
  catch { feedback('Promjena veze nije potvrđena.', 'error'); }
});
function clock() {
  const date = new Date();
  element('time').textContent = date.toLocaleTimeString('hr-HR', {hour:'2-digit',minute:'2-digit'});
  element('date').textContent = date.toLocaleDateString('hr-HR', {weekday:'long',day:'numeric',month:'long',year:'numeric'});
}
clock(); void refresh(); setInterval(clock, 1000); setInterval(() => { void refresh(); }, 1500);
