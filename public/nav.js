document.getElementById('navToggle')?.addEventListener('click', function () {
  const open = this.getAttribute('aria-expanded') === 'true';
  this.setAttribute('aria-expanded', String(!open));
  const sheet = document.getElementById('sheet');
  if (sheet) sheet.hidden = open;
});
