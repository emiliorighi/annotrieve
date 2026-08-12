import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import { getOrganism, listOrganisms } from "./organisms"
import {
  getFetchCalls,
  mockJsonResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "@/lib/test/mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

describe("organisms API clients", () => {
  it("listOrganisms GETs /organisms", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ total: 0, offset: 0, limit: 20, results: [] }),
    )
    await listOrganisms({ filter: "homo", limit: 5 })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/organisms?filter=homo&limit=5",
    )
  })

  it("getOrganism encodes taxid", async () => {
    withFetchHandler(() => mockJsonResponse({ taxid: "9606" }))
    await getOrganism("9606")
    assert.equal(getFetchCalls()[0].url, "/annotrieve/api/v0/organisms/9606")
  })
})
