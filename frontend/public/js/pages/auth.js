import { h, raw } from '../core/dom.js';
import { onForm, formData } from '../core/actions.js';
import { applyApiError, clearErrors, field, rules, showErrors, validate } from '../core/forms.js';
import { navigate } from '../core/router.js';
import { isAuthed } from '../core/state.js';
import { toast } from '../core/toast.js';
import { campaign, img } from '../data/images.js';
import { login, register } from '../services/auth.js';

const safeNext = (n) => (typeof n === 'string' && n.startsWith('/') && !n.startsWith('//') && !n.startsWith('/login') && !n.startsWith('/register') ? n : '');
const nextFrom = (form) => safeNext(new URLSearchParams(location.search).get('next') || form?.dataset.next);

function shell({ title, eyebrow, body, alt }) {
  const c = campaign('auth', { w: 1000, h: 1400, big: 'ME', glyph: null, label: '' });
  return h`
  <div class="auth">
    <div class="auth__art">${raw(img({ ...c, cls: 'cover', alt: '', loading: 'eager' }))}<div class="auth__quote"><p class="display-md">Built<br>in the dark.</p></div></div>
    <div class="auth__panel">
      <div class="auth__box">
        <p class="eyebrow">${eyebrow}</p><h1 class="display-md">${title}</h1>
        ${body}
        <p class="muted small auth__alt">${alt}</p>
      </div>
    </div>
  </div>`;
}

export const loginPage = {
  title: 'Sign in',
  render({ query }) {
    if (isAuthed()) { navigate(safeNext(query.next) || '/account', { replace: true }); return null; }
    const gate = query.next?.startsWith('/checkout') ? 'Sign in to complete your order.' : query.next?.startsWith('/admin') ? 'Sign in with an admin account.' : '';
    return shell({
      eyebrow: 'Welcome back', title: 'Sign in',
      body: h`<form class="auth__form" data-form="login" novalidate>
        <div data-alert-slot>${gate ? h`<div class="form-alert form-alert--info" data-form-alert>${gate}</div>` : ''}</div>
        ${field({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', required: true })}
        ${field({ name: 'password', label: 'Password', type: 'password', autocomplete: 'current-password', required: true })}
        <button type="submit" class="btn btn--primary btn--block">Sign in</button>
      </form>`,
      alt: h`New to M.E? <a class="link" href="/register${query.next ? `?next=${encodeURIComponent(query.next)}` : ''}" data-link>Create an account</a>`
    });
  }
};

export const registerPage = {
  title: 'Create account',
  render({ query }) {
    if (isAuthed()) { navigate(safeNext(query.next) || '/account', { replace: true }); return null; }
    return shell({
      eyebrow: 'Join M.E', title: 'Create account',
      body: h`<form class="auth__form" data-form="register" novalidate>
        <div data-alert-slot></div>
        ${field({ name: 'name', label: 'Full name', autocomplete: 'name', required: true })}
        ${field({ name: 'email', label: 'Email', type: 'email', autocomplete: 'email', required: true })}
        ${field({ name: 'password', label: 'Password', type: 'password', autocomplete: 'new-password', required: true, hint: 'At least 8 characters.' })}
        ${field({ name: 'confirm', label: 'Confirm password', type: 'password', autocomplete: 'new-password', required: true })}
        <button type="submit" class="btn btn--primary btn--block">Create account</button>
        <p class="small dim">By creating an account you agree to the <a class="link" href="/terms" data-link>Terms</a> and <a class="link" href="/privacy-policy" data-link>Privacy Policy</a>. An account is required to place orders.</p>
      </form>`,
      alt: h`Already a member? <a class="link" href="/login${query.next ? `?next=${encodeURIComponent(query.next)}` : ''}" data-link>Sign in</a>`
    });
  }
};

onForm('login', async (form) => {
  clearErrors(form);
  const data = formData(form);
  if (showErrors(form, validate(data, { email: [rules.required('Email'), rules.email], password: [rules.required('Password')] }))) return;
  try {
    const user = await login(data.email, data.password);
    toast(`Welcome back, ${user.name.split(' ')[0]}.`, 'success');
    navigate(nextFrom(form) || (user.role === 'admin' ? '/admin' : '/account'));
  } catch (err) { applyApiError(form, err); }
});

onForm('register', async (form) => {
  clearErrors(form);
  const data = formData(form);
  const errors = validate(data, {
    name: [rules.required('Name')], email: [rules.required('Email'), rules.email],
    password: [rules.required('Password'), rules.min(8, 'Password')],
    confirm: [(v) => (v === data.password ? '' : 'Passwords do not match')]
  });
  if (showErrors(form, errors)) return;
  try {
    await register({ name: data.name, email: data.email, password: data.password });
    toast('Account created — welcome to M.E.', 'success');
    navigate(nextFrom(form) || '/account');
  } catch (err) {
    applyApiError(form, err);
    if (err.status === 409) showErrors(form, { email: err.message });
  }
});
