import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  getFetchCalls,
  installFetchMock,
  mockJsonResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "./mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

describe("mock-fetch", () => {
  it("installs a handler that returns staged JSON and records the call", async () => {
    withFetchHandler(() => mockJsonResponse({ ok: true }))

    const res = await fetch("/annotrieve/api/v0/annotations", { method: "GET" })
    const body = await res.json()

    assert.equal(res.ok, true)
    assert.equal(res.status, 200)
    assert.deepEqual(body, { ok: true })

    const calls = getFetchCalls()
    assert.equal(calls.length, 1)
    assert.equal(calls[0].url, "/annotrieve/api/v0/annotations")
    assert.equal(calls[0].method, "GET")
  })

  it("uninstall restores the previous fetch implementation", async () => {
    const original = globalThis.fetch
    installFetchMock(() => mockJsonResponse({ mocked: true }))
    uninstallFetchMock()
    assert.equal(globalThis.fetch, original)
  })
})
