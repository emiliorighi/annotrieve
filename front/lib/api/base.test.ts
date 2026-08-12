import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { apiGet, apiPost, buildQuery } from "./base"
import {
  getFetchCalls,
  mockBlobResponse,
  mockJsonResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "@/lib/test/mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

describe("buildQuery", () => {
  it("returns empty string for empty params", () => {
    assert.equal(buildQuery(), "")
    assert.equal(buildQuery({}), "")
  })

  it("omits undefined, null, and empty string", () => {
    assert.equal(
      buildQuery({ a: undefined, b: null, c: "", d: "ok" }),
      "?d=ok",
    )
  })

  it("stringifies numbers and booleans", () => {
    assert.equal(buildQuery({ limit: 20, flag: true }), "?limit=20&flag=true")
  })

  it("encodes special characters", () => {
    assert.equal(buildQuery({ filter: "a b&c" }), "?filter=a+b%26c")
  })
})

describe("apiGet", () => {
  it("GETs JSON from the default API base with Accept header", async () => {
    withFetchHandler(() => mockJsonResponse({ total: 1, results: [] }))

    const data = await apiGet<{ total: number }>("/annotations", {
      limit: 10,
      offset: 0,
    })

    assert.deepEqual(data, { total: 1, results: [] })
    const call = getFetchCalls()[0]
    assert.equal(call.method, "GET")
    assert.equal(call.url, "/annotrieve/api/v0/annotations?limit=10&offset=0")
    const headers = new Headers(call.headers)
    assert.equal(headers.get("Accept"), "application/json")
  })

  it("throws on non-OK responses", async () => {
    withFetchHandler(() => mockJsonResponse({ detail: "nope" }, { status: 500 }))

    await assert.rejects(
      () => apiGet("/annotations"),
      /GET \/annotations failed: 500/,
    )
  })
})

describe("apiPost", () => {
  it("POSTs JSON body and returns parsed JSON", async () => {
    withFetchHandler(() => mockJsonResponse({ total: 2, results: [] }))

    const data = await apiPost<{ total: number }>("/annotations", {
      md5_checksums: ["abc"],
      limit: 2,
    })

    assert.equal(data.total, 2)
    const call = getFetchCalls()[0]
    assert.equal(call.method, "POST")
    assert.equal(call.url, "/annotrieve/api/v0/annotations")
    assert.equal(
      call.body,
      JSON.stringify({ md5_checksums: ["abc"], limit: 2 }),
    )
    const headers = new Headers(call.headers)
    assert.equal(headers.get("Content-Type"), "application/json")
  })

  it("returns a blob when responseType is blob", async () => {
    const blob = new Blob(["hello"], { type: "application/x-tar" })
    withFetchHandler(() => mockBlobResponse(blob))

    const result = await apiPost<Blob>(
      "/annotations/download",
      { md5_checksums: ["abc"] },
      {},
      {},
      "blob",
    )

    assert.ok(result instanceof Blob)
    assert.equal(await result.text(), "hello")
  })

  it("throws on non-OK responses", async () => {
    withFetchHandler(() => mockJsonResponse({ detail: "bad" }, { status: 400 }))

    await assert.rejects(
      () => apiPost("/annotations", {}),
      /POST \/annotations failed: 400/,
    )
  })
})
