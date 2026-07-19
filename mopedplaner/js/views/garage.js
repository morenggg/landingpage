/**
 * MopedPlaner – Garage
 * Fahrzeugliste + Anlegen/Bearbeiten über Bottom-Sheet-Formular.
 */

import { el, icon, openSheet, closeSheet, toast, emptyState, fmtDate } from '../ui.js';
import { Vehicles, Tasks, Logs, shrinkImage } from '../store.js';
import { getModel, modelsByCategory } from '../data/models.js';
import { navigate, refresh } from '../router.js';

export async function renderGarage(params = {}) {
  const vehicles = await Vehicles.all();
  const wrap = el('div', { class: 'view' });

  wrap.append(
    el(
      'header',
      { class: 'page-head' },
      el('div', {},
        el('h1', {}, 'Garage'),
        el('p', { class: 'muted' }, vehicles.length ? `${vehicles.length} Fahrzeug${vehicles.length > 1 ? 'e' : ''}` : 'Noch leer – Zeit, das zu ändern.')
      ),
      el('button', { class: 'btn btn-primary btn-compact', onclick: () => openVehicleForm() }, icon('plus', 18), 'Fahrzeug')
    )
  );

  if (!vehicles.length) {
    wrap.append(
      emptyState('garage', 'Noch kein Fahrzeug angelegt',
        'Lege dein erstes Fahrzeug an, um Wartungen, Reparaturen und passende Ersatzteile zu verwalten.',
        el('button', { class: 'btn btn-primary', onclick: () => openVehicleForm() }, icon('plus', 18), 'Fahrzeug anlegen'))
    );
  } else {
    const grid = el('div', { class: 'garage-grid' });
    for (const v of vehicles) {
      const model = getModel(v.modelId);
      const [tasks, logs] = await Promise.all([Tasks.byVehicle(v.id), Logs.byVehicle(v.id)]);
      const open = tasks.filter((t) => !t.done).length;
      const lastLog = logs[0];
      grid.append(
        el(
          'a',
          { class: 'vehicle-card wide', href: `#/fahrzeug/${v.id}` },
          v.photo
            ? el('div', { class: 'vehicle-photo', style: `background-image:url('${v.photo}')` })
            : el('div', { class: 'vehicle-photo placeholder' }, icon('moped', 42)),
          el(
            'div',
            { class: 'vehicle-card-body' },
            el('strong', {}, v.name || model?.name || 'Fahrzeug'),
            el('span', { class: 'muted small' }, [model?.name, v.baujahr && `Bj. ${v.baujahr}`, v.motor].filter(Boolean).join(' · ') || 'Keine Details'),
            el('span', { class: 'muted small' },
              open ? `${open} Aufgabe${open > 1 ? 'n' : ''} offen` : 'Nichts offen',
              lastLog ? ` · Zuletzt: ${fmtDate(lastLog.date)}` : ''),
            zustandBar(v.zustand)
          ),
          icon('chevR', 20, 'muted vehicle-chev')
        )
      );
    }
    wrap.append(grid);
  }

  // Deep-Link: #/garage?neu=1 öffnet direkt das Formular
  if (params.query?.neu) setTimeout(() => openVehicleForm(), 50);

  return wrap;
}

const ZUSTAND_WORDS = { 1: 'Scheunenfund', 2: 'Bastelobjekt', 3: 'Solide', 4: 'Gepflegt', 5: 'Neuwertig' };

function zustandBar(z) {
  const val = Math.max(1, Math.min(5, Number(z) || 3));
  const bar = el('div', { class: 'zustand' });
  for (let i = 1; i <= 5; i++) bar.append(el('span', { class: 'z-seg' + (i <= val ? ' on' : '') }));
  return el('div', { class: 'zustand-row', 'aria-label': `Zustand: ${ZUSTAND_WORDS[val]}` },
    bar, el('span', { class: 'zustand-word' }, ZUSTAND_WORDS[val]));
}

/** Formular für Anlegen & Bearbeiten. */
export function openVehicleForm(vehicle = null, onSaved = null) {
  const isEdit = !!vehicle;
  const v = vehicle || {};
  let photoData = v.photo || null;

  const field = (label, name, value, attrs = {}) =>
    el('label', { class: 'field' },
      el('span', {}, label),
      el('input', { name, value: value ?? '', ...attrs })
    );

  // Modell-Auswahl gruppiert nach Kategorie
  const select = el('select', { name: 'modelId', class: 'field-input' });
  for (const cat of modelsByCategory()) {
    const group = el('optgroup', { label: cat.name });
    for (const m of cat.models) {
      group.append(el('option', { value: m.id, selected: m.id === v.modelId || null }, m.name));
    }
    select.append(group);
  }
  if (!isEdit) select.value = 's51';

  const modelInfo = el('p', { class: 'muted small model-info' });
  const updateModelInfo = () => {
    const m = getModel(select.value);
    modelInfo.textContent = m ? [m.years, m.engine, m.ccm && `${m.ccm} ccm`, m.mix !== '—' && `Gemisch ${m.mix}`].filter(Boolean).join(' · ') : '';
  };
  select.addEventListener('change', updateModelInfo);
  updateModelInfo();

  // Foto
  const photoPreview = el('div', { class: 'photo-preview' + (photoData ? '' : ' empty') });
  const refreshPhoto = () => {
    photoPreview.classList.toggle('empty', !photoData);
    photoPreview.style.backgroundImage = photoData ? `url('${photoData}')` : '';
    photoPreview.textContent = '';
    if (!photoData) photoPreview.append(icon('camera', 26), el('span', { class: 'small muted' }, 'Foto hinzufügen'));
  };
  refreshPhoto();
  const fileInput = el('input', { type: 'file', accept: 'image/*', style: 'display:none' });
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files[0];
    if (!file) return;
    try {
      photoData = await shrinkImage(file);
      refreshPhoto();
    } catch {
      toast('Foto konnte nicht geladen werden.', 'err');
    }
  });
  photoPreview.addEventListener('click', () => fileInput.click());

  const form = el(
    'form',
    { class: 'form-stack' },
    el('p', { class: 'form-section' }, 'Basisdaten'),
    photoPreview,
    fileInput,
    field('Name / Spitzname', 'name', v.name, { placeholder: 'z. B. „Oma Ilse"' }),
    el('label', { class: 'field' }, el('span', {}, 'Modell'), select, modelInfo),
    el('div', { class: 'field-row' },
      field('Baujahr', 'baujahr', v.baujahr, { inputmode: 'numeric', placeholder: '1984' }),
      field('Farbe', 'farbe', v.farbe, { placeholder: 'billardgrün' })
    ),
    el('p', { class: 'form-section' }, 'Technik'),
    el('div', { class: 'field-row' },
      field('Motor', 'motor', v.motor, { placeholder: 'M541, 60ccm …' }),
      field('Vergaser', 'vergaser', v.vergaser, { placeholder: '16N1-11' })
    ),
    el('div', { class: 'field-row' },
      field('Zündung', 'zuendung', v.zuendung, { placeholder: 'Original / VAPE' }),
      field('Auspuff', 'auspuff', v.auspuff, { placeholder: 'Original' })
    ),
    el('div', { class: 'field-row' },
      field('Rahmennummer', 'rahmennummer', v.rahmennummer, { placeholder: 'optional' }),
      field('Motornummer', 'motornummer', v.motornummer, { placeholder: 'optional' })
    ),
    el('p', { class: 'form-section' }, 'Zustand & Notizen'),
    el('label', { class: 'field' },
      el('span', {}, `Zustand`),
      el('input', { name: 'zustand', type: 'range', min: 1, max: 5, step: 1, value: v.zustand || 3, class: 'range' }),
      el('div', { class: 'range-labels' }, el('span', { class: 'small muted' }, 'Scheunenfund'), el('span', { class: 'small muted' }, 'Neuwertig'))
    ),
    el('label', { class: 'field' },
      el('span', {}, 'Notizen'),
      el('textarea', { name: 'notizen', rows: 3, placeholder: 'Besonderheiten, Historie, Baustellen …' }, v.notizen || '')
    ),
    el('button', { class: 'btn btn-primary btn-block', type: 'submit' }, isEdit ? 'Speichern' : 'Fahrzeug anlegen')
  );

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    const data = Object.fromEntries(fd.entries());
    data.zustand = Number(data.zustand) || 3;
    data.photo = photoData;
    try {
      if (isEdit) {
        await Vehicles.update(vehicle.id, data);
        toast('Fahrzeug gespeichert');
        closeSheet();
        onSaved ? onSaved() : refresh();
      } else {
        const created = await Vehicles.create(data);
        toast('Fahrzeug angelegt 🎉');
        closeSheet();
        navigate(`fahrzeug/${created.id}`);
      }
    } catch (err) {
      toast(err.message === 'storage-full' ? 'Speicher voll – Foto kleiner wählen oder Daten sichern.' : 'Speichern fehlgeschlagen.', 'err');
    }
  });

  openSheet(isEdit ? 'Fahrzeug bearbeiten' : 'Neues Fahrzeug', form);
}
