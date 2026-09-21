import test from 'node:test';
import assert from 'node:assert/strict';
import { validateContact } from './contact.ts';
const valid = { name: 'Alex', email: 'alex@example.com', user_type: 'Tenant', subject: 'A rental enquiry', message: 'I would like information about this home.' };
test('contact accepts each supported user type', () => {
  for (const user_type of ['Tenant', 'Owner', 'Other']) assert.equal(validateContact({ ...valid, user_type }), null);
});
test('contact rejects blank, invalid and oversized input', () => {
  for (const change of [{ name: '  ' }, { email: 'invalid' }, { email: 'a@b' }, { user_type: 'Admin' }, { subject: ' ' }, { message: 'short' }, { message: 'a'.repeat(5001) }, { name: 'a'.repeat(101) }, { subject: 'a'.repeat(161) }]) assert.ok(validateContact({ ...valid, ...change }));
});
