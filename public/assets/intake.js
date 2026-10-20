export const services = {
  unsure: 'Let’s figure it out', website: 'Website rescue or development',
  software: 'Custom software', automation: 'AI & business automation', data: 'Data & cloud systems',
};
export function validateUrl(value, required = false) {
  if (!value.trim()) return required ? 'Please enter your public website address.' : '';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw Error();
    return '';
  } catch {
    return 'Enter a public http:// or https:// address without login details.';
  }
}
export function prepareMessage(data, kind) {
  const autopsy = kind === 'autopsy';
  const subject = autopsy ? 'Site Autopsy request' : 'Project inquiry';
  const body = [
    `Hello Turkey Vulture,`, '',
    autopsy ? 'I’d like to request a human review of my website.' : 'I’d like to discuss a project.', '',
    `Name: ${data.name.trim()}`, `Email: ${data.email.trim()}`,
    `Business: ${data.business.trim() || 'Not provided'}`,
    ...(autopsy ? [] : [`Area: ${services[data.service] || services.unsure}`]),
    `Website: ${data.url.trim() || 'Not provided'}`, '',
    autopsy ? 'What I’d like help with:' : 'Project details:',
    data.description.trim() || 'I’d appreciate an initial look and a conversation about next steps.',
  ].join('\n');
  return { subject, body };
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('#intake-form');
  const status = document.querySelector('#form-status');
  const preview = document.querySelector('#email-preview');
  const message = document.querySelector('#message-preview');
  const openEmail = document.querySelector('#open-email');
  const copyEmail = document.querySelector('#copy-email');
  if (form) {
    const selected = new URL(location.href).searchParams.get('service');
    if (form.elements.service && Object.hasOwn(services, selected)) form.elements.service.value = selected;
    form.querySelector('[type="submit"]').disabled = false;
    const urlInput = form.elements.url;
    urlInput.addEventListener('input', () => urlInput.setCustomValidity(''));
    form.addEventListener('input', () => {
      // A changed request must be prepared again before it can be sent.
      preview.hidden = true;
      status.textContent = '';
    });
    form.addEventListener('submit', (event) => {
      event.preventDefault();
      urlInput.setCustomValidity(validateUrl(urlInput.value, urlInput.required));
      if (!form.reportValidity()) return;
      const data = Object.fromEntries(new FormData(form));
      const { subject, body } = prepareMessage(data, form.dataset.kind);
      message.value = `To: ${form.dataset.recipient}\nSubject: ${subject}\n\n${body}`;
      openEmail.href = `mailto:${form.dataset.recipient}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      preview.hidden = false;
      status.textContent = 'Draft prepared. Review it below, then send it from your email service.';
      document.querySelector('#preview-title').focus();
    });
    copyEmail.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(message.value);
        status.textContent = 'Message copied. Paste it into your email service and send it to the address shown.';
      } catch {
        message.focus(); message.select();
        status.textContent = 'Select and copy the message above, then paste it into your email service.';
      }
    });
  }
}
