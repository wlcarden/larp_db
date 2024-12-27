function loadCSS() {
  const theme = getCookie('theme') || 'default';
  const head = document.getElementsByTagName('head')[0];
  const style = document.createElement('link');
  style.href = `/themes/${theme}.css`;
  style.type = 'text/css';
  style.rel = 'stylesheet';
  head.append(style);
}

function getCookie(name) {
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop().split(';').shift();
}

document.addEventListener('DOMContentLoaded', loadCSS);