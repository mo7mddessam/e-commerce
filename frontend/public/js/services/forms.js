// Integration boundary for forms that have NO backend endpoint yet.
// The backend exposes no newsletter or contact route, so these functions deliberately
// throw IntegrationUnavailable instead of faking a success. When endpoints exist,
// implement them here with api() and the UI will start reporting real success.
export class IntegrationUnavailable extends Error {
  constructor(what) {
    super(`${what} isn't connected to the backend yet (no API endpoint exists), so nothing was sent.`);
    this.name = 'IntegrationUnavailable';
  }
}

export async function submitNewsletter(/* email */) {
  throw new IntegrationUnavailable('Newsletter sign-up');
}

export async function submitContact(/* { name, email, subject, message } */) {
  throw new IntegrationUnavailable('The contact form');
}

/** Email shown on the Contact page — replace with a real inbox. */
export const CONTACT_EMAIL = 'hello@me-store.example';
