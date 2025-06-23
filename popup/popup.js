document.getElementById('saveBtn').addEventListener('click', async () => {
  const theme = document.getElementById('theme').value;
  const note = document.getElementById('note').value;
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const url = tab.url;

  fetch('http://localhost:8000/collect', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ theme, note, url })
  }).then(() => alert('Saved!'));
});