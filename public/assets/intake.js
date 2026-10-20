export const services = {
  unsure: 'Let’s figure it out',
  website: 'Website rescue or development',
  software: 'Custom software',
  automation: 'AI & business automation',
  data: 'Data & cloud systems',
};

const EMAIL_PATTERN =
  /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?)+$/;

export function validEmail(value) {
  return value.length <= 254 && !/[\s<>(),;:"\\]/.test(value) && EMAIL_PATTERN.test(value);
}

export function validateUrl(value, required = false) {
  if (!value.trim()) return required ? 'Please enter your public website address.' : '';
  if (value.length > 500) return 'Please use a website address under 500 characters.';
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || !url.hostname.includes('.')) throw Error();
    return '';
  } catch {
    return 'Enter a public http:// or https:// address without login details.';
  }
}

export function validateInquiry(data, kind) {
  const autopsy = kind === 'autopsy';
  const errors = {};
  const name = data.name.trim();
  const email = data.email.trim();
  const business = data.business.trim();
  const url = data.url.trim();
  const description = data.description.trim();

  if (!name) errors.name = 'Please tell us your name.';
  else if (name.length > 100) errors.name = 'Please keep your name under 100 characters.';

  if (!email) errors.email = 'Please enter an email address.';
  else if (!validEmail(email)) errors.email = 'Please enter a valid email address.';

  if (business.length > 120) errors.business = 'Please keep the business name under 120 characters.';

  if (!autopsy && !Object.hasOwn(services, data.service)) errors.service = 'Please choose an area we can help with.';

  const urlError = validateUrl(url, autopsy);
  if (urlError) errors.url = urlError;

  if (!autopsy && description.length < 20) errors.description = 'Please add at least 20 characters so we have enough context.';
  else if (description.length > 2000) errors.description = 'Please keep the description under 2,000 characters.';

  return { errors, value: { name, email, business, url, service: autopsy ? '' : data.service, description } };
}

if (typeof document !== 'undefined') {
  const form = document.querySelector('#intake-form');
  const status = document.querySelector('#form-status');
  const success = document.querySelector('#intake-success');
  const reference = document.querySelector('#reference-id');
  const submit = form?.querySelector('[type="submit"]');
  const turnstileContainer = form?.querySelector('.cf-turnstile');
  const verificationError = document.querySelector('#verification-error');
  const fields = ['name', 'email', 'business', 'service', 'url', 'description'];
  let widgetId = null;
  let turnstileToken = '';
  let turnstileLoading = false;
  let submitting = false;

  if (form) {
    const selected = new URL(location.href).searchParams.get('service');
    if (form.elements.service && Object.hasOwn(services, selected)) form.elements.service.value = selected;

    function field(name) {
      return form.elements.namedItem(name);
    }

    function showError(name, message) {
      const input = field(name);
      const output = document.querySelector(`#${name}-error`);
      if (!input || !output) return;
      output.textContent = message || '';
      output.hidden = !message;
      if (message) input.setAttribute('aria-invalid', 'true');
      else input.removeAttribute('aria-invalid');
    }

    function clearErrors() {
      for (const name of fields) showError(name, '');
      verificationError.textContent = '';
      verificationError.hidden = true;
    }

    function setStatus(message) {
      status.textContent = message;
      status.hidden = !message;
    }

    function renderTurnstile() {
      if (!window.turnstile || widgetId !== null) return;
      widgetId = window.turnstile.render(turnstileContainer, {
        sitekey: turnstileContainer.dataset.sitekey,
        action: 'contact',
        theme: 'light',
        callback: (token) => {
          turnstileToken = token;
          verificationError.textContent = '';
          verificationError.hidden = true;
        },
        'expired-callback': () => {
          turnstileToken = '';
        },
        'error-callback': () => {
          turnstileToken = '';
          verificationError.textContent =
            'Verification couldn’t load. Please try again, or email contact@turkeyvulturesoftware.com.';
          verificationError.hidden = false;
        },
      });
    }

    function loadTurnstile() {
      if (turnstileLoading || widgetId !== null) return;
      turnstileLoading = true;
      if (window.turnstile) {
        renderTurnstile();
        return;
      }
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';
      script.async = true;
      script.onload = renderTurnstile;
      script.onerror = () => {
        verificationError.textContent =
          'Verification couldn’t load. Please check your connection and try again, or email contact@turkeyvulturesoftware.com.';
        verificationError.hidden = false;
      };
      document.head.append(script);
    }

    // The challenge script is loaded only when the visitor starts the form.
    form.addEventListener('focusin', loadTurnstile, { once: true });
    form.addEventListener('pointerdown', loadTurnstile, { once: true });

    const urlInput = form.elements.url;
    urlInput.addEventListener('input', () => urlInput.setCustomValidity(''));
    form.addEventListener('input', () => setStatus(''));

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;

      clearErrors();
      const data = Object.fromEntries(new FormData(form));
      const { errors, value } = validateInquiry(data, form.dataset.kind);
      const order = ['name', 'email', 'business', 'service', 'url', 'description'];
      const invalid = order.filter((name) => errors[name]);
      if (invalid.length) {
        for (const name of invalid) showError(name, errors[name]);
        field(invalid[0]).focus();
        return;
      }

      loadTurnstile();
      const token =
        (window.turnstile && widgetId !== null && window.turnstile.getResponse(widgetId)) ||
        turnstileToken;
      if (!token) {
        verificationError.textContent =
          'Please complete the verification, or email contact@turkeyvulturesoftware.com.';
        verificationError.hidden = false;
        verificationError.focus();
        return;
      }

      submitting = true;
      submit.disabled = true;
      submit.setAttribute('aria-busy', 'true');
      submit.textContent = 'Sending…';
      setStatus('Sending your request…');

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 20000);

      try {
        const response = await fetch('/api/contact', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            requestType: form.dataset.kind,
            name: value.name,
            email: value.email,
            business: value.business,
            website: value.url,
            service: value.service,
            description: value.description,
            fax: data.fax || '',
            turnstileToken: token,
          }),
          signal: controller.signal,
        });
        const result = await response.json().catch(() => ({}));

        if (response.ok && result.ok) {
          form.hidden = true;
          reference.textContent = result.id;
          success.hidden = false;
          success.querySelector('h2').focus();
          return;
        }

        if (result.fields) {
          for (const [name, message] of Object.entries(result.fields)) {
            if (fields.includes(name)) showError(name, message);
          }
        }
        setStatus(
          result.error ||
            'We couldn’t send your request. Please try again, or email contact@turkeyvulturesoftware.com.',
        );
        status.focus();
      } catch {
        setStatus(
          'We couldn’t reach the server. Please check your connection and try again, or email contact@turkeyvulturesoftware.com.',
        );
        status.focus();
      } finally {
        clearTimeout(timer);
        submitting = false;
        submit.disabled = false;
        submit.removeAttribute('aria-busy');
        submit.textContent = 'Send request ↗';
        if (window.turnstile && widgetId !== null) {
          window.turnstile.reset(widgetId);
          turnstileToken = '';
        }
      }
    });
  }
}
