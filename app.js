// shared hub logic: settings + tab cloak
const DEFAULTS = { title: '', icon: '', cloak: 'default', theme: 'dark' };

function loadSettings() {
  try { return Object.assign({}, DEFAULTS, JSON.parse(localStorage.getItem('hub-settings') || '{}')); }
  catch (e) { return Object.assign({}, DEFAULTS); }
}
function saveSettings(s) { localStorage.setItem('hub-settings', JSON.stringify(s)); }

const CLOAKS = {
  default: { title: 'Game Hub', icon: '' },
  classroom: { title: 'Google Classroom', icon: 'https://ssl.gstatic.com/classroom/favicon.png' },
  docs: { title: 'Google Docs', icon: 'https://ssl.gstatic.com/docs/documents/images/kix-favicon7.ico' },
  drive: { title: 'Google Drive', icon: 'https://ssl.gstatic.com/images/branding/product/1x/drive_2020q4_32dp.png' },
  canvas: { title: 'Dashboard', icon: 'https://canvas.instructure.com/favicon.ico' },
  clever: { title: 'Clever | Portal', icon: 'https://assets.clever.com/launchpad/2.70.1/favicon.ico' }
};

function applySettings() {
  const s = loadSettings();
  document.documentElement.setAttribute('data-theme', s.theme || 'dark');
  const cloak = CLOAKS[s.cloak] || CLOAKS.default;
  const title = s.title || cloak.title;
  document.title = title;
  const icon = s.icon || cloak.icon;
  let link = document.querySelector("link[rel~='icon']");
  if (icon) {
    if (!link) { link = document.createElement('link'); link.rel = 'icon'; document.head.appendChild(link); }
    link.href = icon;
  } else if (link) { link.remove(); }
}

// run ASAP to cloak before paint
applySettings();
