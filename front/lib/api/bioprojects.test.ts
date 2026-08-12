import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { getBioproject, listBioprojects } from "./bioprojects"
import {
  getFetchCalls,
  mockJsonResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "@/lib/test/mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

describe("bioprojects API clients", () => {
  it("listBioprojects GETs /bioprojects", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ total: 0, offset: 0, limit: 20, results: [] }),
    )
    await listBioprojects({ filter: "PRJ", limit: 5 })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/bioprojects?filter=PRJ&limit=5",
    )
  })

  it("getBioproject encodes accession", async () => {
    withFetchHandler(() => mockJsonResponse({ accession: "PRJNA1" }))
    await getBioproject("PRJNA1")
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/bioprojects/PRJNA1",
    )
  })
})
