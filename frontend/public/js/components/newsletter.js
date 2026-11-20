import { h } from '../core/dom.js';
import { onForm, formData } from '../core/actions.js';
import { clearErrors, formAlert, rules, showErrors, validate } from '../core/forms.js';
import { IntegrationUnavailable, submitNewsletter } from '../services/forms.js';

export const newsletter = () => h`
  <section class="newsletter reveal">
    <div class="wrap newsletter__in">
      <div>
        <p class="eyebrow">Inside M.E</p>
        <h2 class="display-md">First access to every drop</h2>
        <p class="muted" style="margin-top:1rem;max-width:46ch">New collections, restocks and campaign previews — one considered email, never noise.</p>
      </div>
      <form class="newsletter__form" data-form="newsletter" novalidate>
        <div data-alert-slot></div>
        <div class="field" data-field="email">
          <label for="nl-email" class="sr-only">Email address</label>
          <div class="newsletter__row">
            <input id="nl-email" name="email" type="email" class="input" placeholder="Your email address" autocomplete="email" aria-describedby="nl-email-err" required>
            <button type="submit" class="btn btn--light">Subscribe</button>
          </div>
          <p class="field-error" id="nl-email-err" role="alert"></p>
        </div>
        <p class="small dim">By subscribing you agree to our <a class="link" href="/privacy-policy" data-link>Privacy Policy</a>.</p>
      </form>
    </div>
  </section>`;

onForm('newsletter', async (form) => {
  clearErrors(form);
  const data = formData(form);
  if (showErrors(form, validate(data, { email: [rules.required('Email'), rules.email] }))) return;
  try {
    await submitNewsletter(data.email);
    formAlert(form, 'Thanks — you are subscribed.', 'ok');
    form.reset();
  } catch (err) {
    if (err instanceof IntegrationUnavailable) formAlert(form, err.message, 'info');
    else formAlert(form, err.message);
  }
});
