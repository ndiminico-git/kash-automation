/* Shared lifecycle for the existing #darkModal dialogs. No project writes. */
(() => {
  'use strict';

  let active = null;

  function close(overlay = document.getElementById('darkModal')) {
    if (!overlay) return;
    if (active?.overlay === overlay) {
      document.removeEventListener('keydown', active.listener, true);
      active = null;
    }
    overlay.remove();
  }

  function listen(overlay, handler) {
    if (active) close(active.overlay);
    const project = D;
    const listener = event => {
      // Also release handlers if another component removed the DOM directly.
      if (!overlay.isConnected || D !== project) {
        close(overlay);
        return;
      }
      handler(event);
    };
    active = { overlay, listener, project };
    document.addEventListener('keydown', listener, true);
  }

  function closeForProject(project) {
    if (active && active.project !== project) close(active.overlay);
  }

  window.KashDialogs = Object.freeze({ close, listen, closeForProject });
})();

function darkAlert(message, title = KashI18n.text('Faltan datos')) {
  KashDialogs.close();
  const overlay = document.createElement('div');
  overlay.id = 'darkModal';
  overlay.className = 'darkModal';
  overlay.innerHTML = KashI18n.template`<div class="darkModalBox validation"><div class="darkModalHead"><div class="validationIcon">!</div><div class="darkModalHeadText"><div class="darkModalTitle">${esc(title)}</div><div class="darkModalText">${esc(message)}</div></div></div><div class="darkModalActions"><button class="btn" id="darkOk">Aceptar</button></div></div>`;
  document.body.appendChild(overlay);
  const close = () => KashDialogs.close(overlay);
  KashDialogs.listen(overlay, event => {
    if (event.key === 'Escape' || event.key === 'Enter') {
      event.preventDefault();
      close();
    }
  });
  overlay.querySelector('#darkOk').onclick = close;
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
  setTimeout(() => overlay.querySelector('#darkOk')?.focus(), 0);
}

function darkConfirm(message, onYes, title = KashI18n.text('Confirmar')) {
  KashDialogs.close();
  const overlay = document.createElement('div');
  overlay.id = 'darkModal';
  overlay.className = 'darkModal';
  overlay.innerHTML = KashI18n.template`<div class="darkModalBox"><div class="darkModalTitle">${esc(title)}</div><div class="darkModalText">${esc(message)}</div><div class="darkModalActions"><button class="btn g" id="darkCancel">Cancelar</button><button class="btn d" id="darkOk">Aceptar</button></div></div>`;
  document.body.appendChild(overlay);
  const close = () => KashDialogs.close(overlay);
  KashDialogs.listen(overlay, event => {
    if (event.key === 'Escape') { event.preventDefault(); close(); }
  });
  overlay.querySelector('#darkCancel').onclick = close;
  overlay.querySelector('#darkOk').onclick = () => { close(); onYes?.(); };
  overlay.addEventListener('click', event => { if (event.target === overlay) close(); });
}

function darkSavePrompt(message, onSave, onDiscard, onCancel) {
  KashDialogs.close();
  const overlay = document.createElement('div');
  overlay.id = 'darkModal';
  overlay.className = 'darkModal';
  overlay.innerHTML = KashI18n.template`<div class="darkModalBox"><div class="darkModalTitle">Cambios sin guardar</div><div class="darkModalText">${esc(message)}</div><div class="darkModalActions"><button class="btn g" id="darkCancel">Cancelar</button><button class="btn d" id="darkDiscard">No guardar</button><button class="btn" id="darkSave">Guardar</button></div></div>`;
  document.body.appendChild(overlay);
  let done = false;
  const finish = callback => {
    if (done) return;
    done = true;
    KashDialogs.close(overlay);
    callback?.();
  };
  const cancel = () => finish(onCancel);
  KashDialogs.listen(overlay, event => {
    if (event.key === 'Escape') { event.preventDefault(); cancel(); }
  });
  overlay.querySelector('#darkCancel').onclick = cancel;
  overlay.querySelector('#darkDiscard').onclick = () => finish(onDiscard);
  overlay.querySelector('#darkSave').onclick = () => finish(onSave);
  overlay.addEventListener('click', event => { if (event.target === overlay) cancel(); });
}
