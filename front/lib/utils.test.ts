import { describe, it } from "node:test"
import assert from "node:assert/strict"
import { buildParamsFromFilters } from "./utils"
import { buildAnalyticsParamsEntries } from "./analytics-params"
import type { FiltersState } from "./stores/annotations-filters"

const emptyFilters: FiltersState = {
  selectedTaxons: [],
  selectedOrganisms: [],
  selectedAssemblies: [],
  selectedBioprojects: [],
  selectedAssemblyLevels: [],
  selectedAssemblyStatuses: [],
  onlyRefGenomes: false,
  biotypes: [],
  featureTypes: [],
  featureSources: [],
  pipelines: [],
  providers: [],
  databaseSources: [],
  buscoCompleteFrom: null,
  buscoCompleteTo: null,
}

describe("buildParamsFromFilters", () => {
  it("maps taxons, assemblies, refseq, and providers to CSV params", () => {
    const params = buildParamsFromFilters({
      ...emptyFilters,
      selectedTaxons: [
        { taxid: "9606", scientific_name: "Homo sapiens" } as never,
        { taxid: "10090", scientific_name: "Mus musculus" } as never,
      ],
      selectedAssemblies: [
        { assembly_accession: "GCA_1" } as never,
        { assembly_accession: "GCA_2" } as never,
      ],
      onlyRefGenomes: true,
      providers: ["NCBI", "Ensembl, EMBL"],
    })
    assert.equal(params.taxids, "9606,10090")
    assert.equal(params.assembly_accessions, "GCA_1,GCA_2")
    assert.equal(params.refseq_categories, "reference genome")
    assert.equal(params.providers, 'NCBI,"Ensembl, EMBL"')
  })

  it("returns empty object for empty filters", () => {
    assert.deepEqual(buildParamsFromFilters(emptyFilters), {})
  })
})

describe("buildAnalyticsParamsEntries", () => {
  it("current source strips limit/offset", () => {
    const entries = buildAnalyticsParamsEntries({
      dataSource: "current",
      selectedSubsetIds: [],
      currentParams: { taxids: "9606", limit: 20, offset: 0 },
      subsets: [],
    })
    assert.equal(entries.length, 1)
    assert.equal(entries[0].id, "current")
    assert.deepEqual(entries[0].params, { taxids: "9606" })
  })

  it("subsets source filters by selected ids via buildParamsFromFilters", () => {
    const entries = buildAnalyticsParamsEntries({
      dataSource: "subsets",
      selectedSubsetIds: ["s2"],
      currentParams: {},
      subsets: [
        {
          id: "s1",
          name: "One",
          filters: { ...emptyFilters, providers: ["A"] },
        },
        {
          id: "s2",
          name: "Two",
          color: "#abc",
          filters: {
            ...emptyFilters,
            selectedTaxons: [{ taxid: "1" } as never],
          },
        },
      ],
    })
    assert.equal(entries.length, 1)
    assert.equal(entries[0].id, "s2")
    assert.equal(entries[0].color, "#abc")
    assert.equal(entries[0].params.taxids, "1")
  })
})
