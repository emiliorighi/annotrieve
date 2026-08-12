import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  assemblyHasChromosomesFile,
  chrAliasesFileUrl,
  chromosomesFileUrl,
  contigsFileUrl,
  fetchChromosomesFromFiles,
  headFile,
  resolveChrAliasesFileUrl,
} from "./files"
import {
  getFetchCalls,
  mockJsonResponse,
  mockTextResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "@/lib/test/mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

describe("files URL builders", () => {
  it("builds chromosomes, aliases, and contigs URLs", () => {
    assert.equal(
      chromosomesFileUrl("9606", "GCA_1"),
      "/annotrieve/files/9606/GCA_1/chromosomes.json",
    )
    assert.equal(
      chrAliasesFileUrl("9606", "GCA_1"),
      "/annotrieve/files/9606/GCA_1/chr_aliases.tsv",
    )
    assert.equal(
      contigsFileUrl("/path/to/file.gff.gz"),
      "/annotrieve/files/path/to/file.gff.gz.contigs.txt",
    )
  })
})

describe("files fetch helpers", () => {
  it("headFile returns true/false from response.ok", async () => {
    withFetchHandler(() => mockTextResponse("", { status: 200 }))
    assert.equal(await headFile("/annotrieve/files/x"), true)

    withFetchHandler(() => mockTextResponse("", { status: 404 }))
    assert.equal(await headFile("/annotrieve/files/missing"), false)
  })

  it("resolveChrAliasesFileUrl prefers primary then paired", async () => {
    withFetchHandler((url) => {
      if (url.includes("GCA_primary")) return mockTextResponse("", { status: 404 })
      if (url.includes("GCA_paired")) return mockTextResponse("", { status: 200 })
      return mockTextResponse("", { status: 404 })
    })
    const url = await resolveChrAliasesFileUrl("9606", "GCA_primary", "GCA_paired")
    assert.equal(url, "/annotrieve/files/9606/GCA_paired/chr_aliases.tsv")
  })

  it("fetchChromosomesFromFiles falls back to paired accession", async () => {
    withFetchHandler((url) => {
      if (url.includes("GCA_primary")) return mockJsonResponse([], { status: 404 })
      return mockJsonResponse([{ chr_name: "1", length: 100 }])
    })
    const rows = await fetchChromosomesFromFiles("9606", "GCA_primary", "GCA_paired")
    assert.equal(rows.length, 1)
    assert.equal(rows[0].chr_name, "1")
    assert.ok(getFetchCalls().some((c) => c.url.includes("GCA_paired")))
  })

  it("assemblyHasChromosomesFile checks primary then paired", async () => {
    withFetchHandler((url) => {
      if (url.includes("GCA_primary")) return mockTextResponse("", { status: 404 })
      return mockTextResponse("", { status: 200 })
    })
    assert.equal(
      await assemblyHasChromosomesFile("9606", "GCA_primary", "GCA_paired"),
      true,
    )
  })
})
