import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  getCountryFrequencies,
  getTopCountries,
  getTopEntities,
  getUsageCapabilities,
  getUsageSummary,
} from "./analytics"
import {
  getFetchCalls,
  mockJsonResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "@/lib/test/mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

describe("analytics API clients", () => {
  it("getCountryFrequencies", async () => {
    withFetchHandler(() => mockJsonResponse({ Spain: 3 }))
    const data = await getCountryFrequencies()
    assert.deepEqual(data, { Spain: 3 })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/analytics/frequencies/country",
    )
  })

  it("getUsageSummary", async () => {
    withFetchHandler(() =>
      mockJsonResponse({
        unique_users: 1,
        active_30d: 1,
        countries: 1,
        returning_pct: 0,
        as_of: "2026-01-01",
      }),
    )
    await getUsageSummary()
    assert.equal(getFetchCalls()[0].url, "/annotrieve/api/v0/analytics/summary")
  })

  it("getTopCountries passes limit", async () => {
    withFetchHandler(() => mockJsonResponse([]))
    await getTopCountries(15)
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/analytics/top-countries?limit=15",
    )
  })

  it("getUsageCapabilities and getTopEntities", async () => {
    withFetchHandler(() => mockJsonResponse({ items: [], as_of: null }))
    await getUsageCapabilities()
    withFetchHandler(() =>
      mockJsonResponse({
        top_assemblies: [],
        top_annotations: [],
        top_taxons: [],
        as_of: null,
      }),
    )
    await getTopEntities()
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/analytics/top-entities",
    )
  })
})
