/**
 * video.js — Erklärvideo: Video-Karte + barrierefreies Modal.
 *
 * Verhalten:
 * - Klick auf die Karte öffnet das Modal und startet das Video (lazy geladen).
 * - ESC oder Klick auf den Hintergrund schließt es.
 * - Fokus wird ins Modal geholt, dort gehalten (Focus-Trap) und beim
 *   Schließen an das auslösende Element zurückgegeben.
 */

const openBtn = document.getElementById('video-open');
const modal = document.getElementById('video-modal');
const closeBtn = document.getElementById('video-modal-close');
const video = document.getElementById('explainer-video');

let lastFocused = null;

function focusables() {
  return [closeBtn, video];
}

function onKeydown(ev) {
  if (ev.key === 'Escape') {
    closeModal();
    return;
  }
  if (ev.key === 'Tab') {
    // Fokus zwischen Schließen-Button und Video halten
    const items = focusables();
    const first = items[0];
    const last = items[items.length - 1];
    if (ev.shiftKey && document.activeElement === first) {
      ev.preventDefault();
      last.focus();
    } else if (!ev.shiftKey && document.activeElement === last) {
      ev.preventDefault();
      first.focus();
    }
  }
}

function openModal() {
  lastFocused = document.activeElement;
  modal.hidden = false;
  requestAnimationFrame(() => modal.classList.add('open'));
  document.body.style.overflow = 'hidden';
  document.addEventListener('keydown', onKeydown);
  closeBtn.focus();
  // preload="none": erst beim Öffnen wird geladen und abgespielt
  const p = video.play();
  if (p) p.catch(() => { /* Autoplay blockiert → Nutzer startet über Controls */ });
}

function closeModal() {
  video.pause();
  modal.classList.remove('open');
  document.body.style.overflow = '';
  document.removeEventListener('keydown', onKeydown);
  window.setTimeout(() => {
    modal.hidden = true;
    if (lastFocused && typeof lastFocused.focus === 'function') lastFocused.focus();
  }, 200);
}

openBtn.addEventListener('click', openModal);
closeBtn.addEventListener('click', closeModal);
modal.querySelector('[data-video-close]').addEventListener('click', closeModal);
