import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import ts from 'typescript';

const source = (path) => readFileSync(new URL(path, import.meta.url), 'utf8');
const moduleUrl = (code) => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;
const compile = (code) => ts.transpileModule(code, {
  compilerOptions: { module: ts.ModuleKind.ESNext, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2022 },
}).outputText;

// Execute the real Login submit handler and real auth/client modules. Stub only
// browser networking and rendering, so bypassing the shared auth client regresses this test.
const clientUrl = moduleUrl(compile(source('../src/api/client.ts')).replaceAll(
  'import.meta', '({env: {VITE_API_BASE_URL: "https://api.example/api/v1"}})',
));
const authUrl = moduleUrl(compile(source('../src/api/auth.ts')).replaceAll("'./client'", JSON.stringify(clientUrl)));
const reactUrl = moduleUrl(`
  export function useState() {
    const harness = globalThis.loginHarness;
    const index = harness.stateIndex++;
    return [harness.states[index], value => { harness.states[index] = value; }];
  }
`);
const routerUrl = moduleUrl('export const useNavigate = () => path => globalThis.loginHarness.navigations.push(path); export const Navigate = "Navigate";');
const contextUrl = moduleUrl('export const useAuth = () => ({user: null, setUser: user => globalThis.loginHarness.users.push(user)});');
const jsxUrl = moduleUrl('export const jsx = (type, props) => ({type, props}); export const jsxs = jsx;');
let loginCode = compile(source('../src/pages/Login.tsx'));
for (const [specifier, url] of [
  ['react', reactUrl], ['react-router-dom', routerUrl], ['react/jsx-runtime', jsxUrl],
  ['../context/AuthContext', contextUrl], ['../api/auth', authUrl], ['../api/client', clientUrl],
]) {
  loginCode = loginCode.replaceAll(`'${specifier}'`, JSON.stringify(url)).replaceAll(`"${specifier}"`, JSON.stringify(url));
}
const { Login } = await import(moduleUrl(loginCode));
const client = await import(clientUrl);
const auth = await import(authUrl);
const doctor = {
  user_id: 6, username: 'doctor1', first_name: 'Jean', last_name: 'Grey',
  role: 'Doctor', branch_id: 1, branch_name: 'Colombo', must_change_password: false,
  csrf_token: 'signed-session-token',
};

function findForm(node) {
  if (!node || typeof node !== 'object') return undefined;
  if (node.type === 'form') return node;
  const children = node.props?.children;
  for (const child of Array.isArray(children) ? children : [children]) {
    const form = findForm(child);
    if (form) return form;
  }
}

test('actual Login form initializes CSRF before consultation completion', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  globalThis.loginHarness = { stateIndex: 0, states: ['doctor1', 'fixture-password', false, '', false], users: [], navigations: [] };
  client.setSessionCsrfToken(null);
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    const body = url.endsWith('/auth/login')
      ? { message: 'Login successful', csrf_token: doctor.csrf_token }
      : url.endsWith('/auth/me') ? doctor : { message: 'Completed' };
    return new Response(JSON.stringify(body), { status: 200 });
  };
  try {
    await findForm(Login()).props.onSubmit({ preventDefault() {} });
    assert.equal(globalThis.loginHarness.users[0].id, 6);
    assert.deepEqual(globalThis.loginHarness.navigations, ['/doctor/dashboard']);
    await client.put('/appointments/42/complete', { diagnosis: 'Fixture', consultation_notes: 'Fixture', treatments: [] });
    assert.equal(calls[0].url, 'https://api.example/api/v1/auth/login');
    assert.equal(calls[1].url, 'https://api.example/api/v1/auth/me');
    assert.equal(calls[2].options.headers['X-CSRF-Token'], doctor.csrf_token);
    assert.equal(calls[2].options.credentials, 'include');
  } finally {
    globalThis.fetch = originalFetch;
    delete globalThis.loginHarness;
    client.setSessionCsrfToken(null);
  }
});

test('auth-me restores the CSRF header after reload without readable API cookies', async () => {
  const originalFetch = globalThis.fetch;
  const calls = [];
  client.setSessionCsrfToken(null);
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options });
    return new Response(JSON.stringify(url.endsWith('/auth/me') ? doctor : {}), { status: 200 });
  };
  try {
    await auth.getMe();
    await client.put('/appointments/42/complete', {});
    assert.equal(calls[1].options.headers['X-CSRF-Token'], doctor.csrf_token);
  } finally {
    globalThis.fetch = originalFetch;
    client.setSessionCsrfToken(null);
  }
});
