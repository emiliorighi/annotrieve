import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  getFlattenedTree,
  getTaxon,
  getTaxonAncestors,
  getTaxonChildren,
  getTaxonRankFrequencies,
  listTaxons,
  parseTsvToFlatTreeNodes,
} from "./taxons"
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

const page = { total: 1, offset: 0, limit: 20, results: [{ taxid: "9606" }] }

describe("taxons API clients", () => {
  it("listTaxons GETs /taxons with query", async () => {
    withFetchHandler(() => mockJsonResponse(page))
    await listTaxons({ filter: "homo", limit: 10 })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/taxons?filter=homo&limit=10",
    )
  })

  it("getTaxon encodes taxid", async () => {
    withFetchHandler(() => mockJsonResponse({ taxid: "9606" }))
    await getTaxon("9606")
    assert.equal(getFetchCalls()[0].url, "/annotrieve/api/v0/taxons/9606")
  })

  it("getTaxonChildren and getTaxonAncestors hit nested paths", async () => {
    withFetchHandler(() => mockJsonResponse(page))
    await getTaxonChildren("9606")
    await getTaxonAncestors("9606")
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/taxons/9606/children",
    )
    assert.equal(
      getFetchCalls()[1].url,
      "/annotrieve/api/v0/taxons/9606/ancestors",
    )
  })

  it("getTaxonRankFrequencies hits frequencies/rank", async () => {
    withFetchHandler(() => mockJsonResponse({ species: 10 }))
    await getTaxonRankFrequencies()
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/taxons/frequencies/rank",
    )
  })

  it("getFlattenedTree json returns fields/rows", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ fields: ["taxid"], rows: [["1"]] }),
    )
    const data = await getFlattenedTree("json")
    assert.deepEqual(data, { fields: ["taxid"], rows: [["1"]] })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/taxons/flattened-tree?format=json",
    )
  })

  it("getFlattenedTree tsv parses nodes", async () => {
    const tsv =
      "taxid\tparent_taxid\tscientific_name\tannotations_count\tassemblies_count\torganisms_count\trank\tcoding_mean_count\tnon_coding_mean_count\tpseudogene_mean_count\tmRNA_mean_count\tlncRNA_mean_count\ttRNA_mean_count\tmiRNA_mean_count\tbusco_single_copy_mean\tbusco_duplicated_mean\tbusco_fragmented_mean\tbusco_missing_mean\n" +
      "2\t1\tBacteria\t3\t4\t5\tphylum\t1\t2\t3\t4\t5\t6\t7\t8\t9\t10\t11\n"
    withFetchHandler(() => mockTextResponse(tsv))
    const nodes = (await getFlattenedTree("tsv")) as ReturnType<
      typeof parseTsvToFlatTreeNodes
    >
    assert.equal(nodes.length, 1)
    assert.equal(nodes[0].id, "2")
    assert.equal(nodes[0].parentId, "1")
    assert.equal(nodes[0].scientific_name, "Bacteria")
  })

  it("getFlattenedTree throws on non-OK", async () => {
    withFetchHandler(() => mockTextResponse("nope", { status: 500 }))
    await assert.rejects(
      () => getFlattenedTree("tsv"),
      /GET \/taxons\/flattened-tree failed: 500/,
    )
  })
})

describe("parseTsvToFlatTreeNodes", () => {
  it("returns empty array for header-only input", () => {
    assert.deepEqual(parseTsvToFlatTreeNodes("taxid\tparent_taxid\n"), [])
  })

  it("maps one data row and null parent", () => {
    const tsv =
      "taxid\tparent_taxid\tscientific_name\tannotations_count\tassemblies_count\torganisms_count\trank\tcoding_mean_count\tnon_coding_mean_count\tpseudogene_mean_count\tmRNA_mean_count\tlncRNA_mean_count\ttRNA_mean_count\tmiRNA_mean_count\tbusco_single_copy_mean\tbusco_duplicated_mean\tbusco_fragmented_mean\tbusco_missing_mean\n" +
      "9606\t\tHomo sapiens\t1\t2\t3\tspecies\t10\t20\t30\t1.5\t2.5\t3.5\t4.5\t90\t5\t3\t2\n"
    const [node] = parseTsvToFlatTreeNodes(tsv)
    assert.equal(node.id, "9606")
    assert.equal(node.parentId, null)
    assert.equal(node.rank, "species")
    assert.equal(node.coding_count, 10)
    assert.equal(node.busco_single_copy_mean, 90)
  })
})
