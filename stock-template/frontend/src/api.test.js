import assert from 'node:assert/strict'
import { test } from 'node:test'
import { loggedFetch } from './api.js'

test('records status, method, API path and elapsed time while preserving the response', async (t) => {
  const response = new Response('{"id":1}', { status: 201 })
  const options = { method: 'POST', body: '{"title":"Task"}' }
  const fetchMock = t.mock.method(globalThis, 'fetch', async () => response)
  const entries = []
  const before = Date.now()
  const result = await loggedFetch('/function/web-spa-stock/api/todos', options, (entry) => entries.push(entry))
  const recordedAt = Date.parse(entries[0].timestamp)
  assert.ok(recordedAt >= before && recordedAt <= Date.now())
  assert.equal(result, response)
  assert.deepEqual(fetchMock.mock.calls[0].arguments, ['/function/web-spa-stock/api/todos', options])
  assert.equal(entries.length, 1)
  assert.equal(entries[0].status, 201)
  assert.equal(entries[0].method, 'POST')
  assert.equal(entries[0].path, '/api/todos')
  assert.ok(Number.isInteger(entries[0].duration) && entries[0].duration >= 0)
  assert.deepEqual(await result.json(), { id: 1 })
})

test('records HTTP failures without swallowing their response bodies', async (t) => {
  t.mock.method(globalThis, 'fetch', async () => new Response('Unavailable', { status: 503 }))
  const entries = []
  const response = await loggedFetch('/api/version', undefined, (entry) => entries.push(entry))
  assert.equal(response.ok, false)
  assert.equal(await response.text(), 'Unavailable')
  assert.equal(entries[0].status, 503)
  assert.equal(entries[0].method, 'GET')
})

test('records network failures and rethrows the original error', async (t) => {
  const failure = new TypeError('Network unavailable')
  t.mock.method(globalThis, 'fetch', async () => { throw failure })
  const entries = []
  await assert.rejects(loggedFetch('/api/todos/2', { method: 'DELETE' }, (entry) => entries.push(entry)), (error) => error === failure)
  assert.equal(entries.length, 1)
  assert.equal(entries[0].status, 'ERR')
  assert.equal(entries[0].method, 'DELETE')
})
