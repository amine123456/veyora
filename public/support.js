const form = document.querySelector('#support-form');
const status = document.querySelector('#form-status');
form?.addEventListener('submit', async (event) => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  status.className = 'message';
  status.textContent = 'Sending…';
  try {
    const response = await fetch('/api/support', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(Object.fromEntries(new FormData(form))),
    });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Could not send your request');
    form.reset();
    status.textContent = `Request received. Your reference is ${result.id}.`;
  } catch (error) {
    status.className = 'message error';
    status.textContent = error.message;
  } finally {
    button.disabled = false;
  }
});
