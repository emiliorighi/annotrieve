import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  getAssembliesStats,
  getAssembly,
  getChrAliases,
  getPairedAssembly,
  listAssemblies,
} from "./assemblies"
import {
  getFetchCalls,
  mockJsonResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "@/lib/test/mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

describe("assemblies API clients", () => {
  it("listAssemblies GETs /assemblies with filters", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ total: 0, offset: 0, limit: 20, results: [] }),
    )
    await listAssemblies({ filter: "GRCh", limit: 5 })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/assemblies?filter=GRCh&limit=5",
    )
  })

  it("getAssembly and getPairedAssembly encode accession", async () => {
    withFetchHandler(() => mockJsonResponse({ assembly_accession: "GCA_1" }))
    await getAssembly("GCA_000001405.29")
    await getPairedAssembly("GCA_000001405.29")
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/assemblies/GCA_000001405.29",
    )
    assert.equal(
      getFetchCalls()[1].url,
      "/annotrieve/api/v0/assemblies/GCA_000001405.29/paired",
    )
  })

  it("getAssembliesStats hits frequencies path", async () => {
    withFetchHandler(() => mockJsonResponse({ chromosome: 3 }))
    await getAssembliesStats({ taxids: "9606" }, "assembly_level")
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/assemblies/frequencies/assembly_level?taxids=9606",
    )
  })

  it("getChrAliases hits chr_aliases path", async () => {
    withFetchHandler(() => mockJsonResponse("ok"))
    await getChrAliases("GCA/odd")
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/assemblies/GCA%2Fodd/chr_aliases",
    )
  })

  it("throws on non-OK getAssembly", async () => {
    withFetchHandler(() => mockJsonResponse({ detail: "missing" }, { status: 404 }))
    await assert.rejects(
      () => getAssembly("missing"),
      /GET \/assemblies\/missing failed: 404/,
    )
  })
})
