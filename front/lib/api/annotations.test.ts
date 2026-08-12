import { afterEach, describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  downloadAnnotationsReport,
  getAnnotation,
  getAnnotationsAggregatesByTaxonRank,
  getBuscoMetricValues,
  getBuscoStats,
  getGeneCategoryMetricValues,
  getGeneStats,
  getTranscriptStats,
  getUploadJobStatus,
  getUploadRateLimit,
  listAnnotations,
  listAnnotationsByMd5Checksums,
  uploadCustomGff,
} from "./annotations"
import {
  getFetchCalls,
  mockBlobResponse,
  mockJsonResponse,
  mockTextResponse,
  uninstallFetchMock,
  withFetchHandler,
} from "@/lib/test/mock-fetch"

afterEach(() => {
  uninstallFetchMock()
})

const page = { total: 1, offset: 0, limit: 20, results: [{ annotation_id: "abc" }] }

describe("listAnnotations", () => {
  it("GETs /annotations with filter and pagination query", async () => {
    withFetchHandler(() => mockJsonResponse(page))

    const data = await listAnnotations({
      filter: "homo",
      limit: 20,
      offset: 5,
    })

    assert.equal(data.total, 1)
    const call = getFetchCalls()[0]
    assert.equal(call.method, "GET")
    assert.equal(
      call.url,
      "/annotrieve/api/v0/annotations?filter=homo&limit=20&offset=5",
    )
  })
})

describe("listAnnotationsByMd5Checksums", () => {
  it("POSTs md5_checksums with default limit length+1", async () => {
    withFetchHandler(() => mockJsonResponse(page))

    await listAnnotationsByMd5Checksums(["aaa", "bbb"])

    const call = getFetchCalls()[0]
    assert.equal(call.method, "POST")
    assert.equal(call.url, "/annotrieve/api/v0/annotations")
    assert.deepEqual(JSON.parse(String(call.body)), {
      md5_checksums: ["aaa", "bbb"],
      limit: 3,
      offset: 0,
    })
  })
})

describe("getAnnotation", () => {
  it("GETs /annotations/{md5}", async () => {
    withFetchHandler(() => mockJsonResponse({ annotation_id: "deadbeef" }))

    const data = await getAnnotation("deadbeef")
    assert.equal(data.annotation_id, "deadbeef")
    assert.equal(getFetchCalls()[0].url, "/annotrieve/api/v0/annotations/deadbeef")
  })

  it("throws on 404", async () => {
    withFetchHandler(() => mockJsonResponse({ detail: "missing" }, { status: 404 }))

    await assert.rejects(
      () => getAnnotation("missing"),
      /GET \/annotations\/missing failed: 404/,
    )
  })
})

describe("downloadAnnotationsReport", () => {
  it("GETs /annotations/report as TSV blob including selected_fields", async () => {
    const blob = new Blob(["annotation_id\tx\n"], {
      type: "text/tab-separated-values",
    })
    withFetchHandler(() => mockBlobResponse(blob))

    const result = await downloadAnnotationsReport({
      selected_fields: "assembly_gc_percent,taxon_lineage",
    })

    assert.ok(result instanceof Blob)
    assert.equal(await result.text(), "annotation_id\tx\n")

    const call = getFetchCalls()[0]
    assert.equal(call.method, "GET")
    assert.equal(
      call.url,
      "/annotrieve/api/v0/annotations/report?selected_fields=assembly_gc_percent%2Ctaxon_lineage",
    )
    const headers = new Headers(call.headers)
    assert.equal(headers.get("Accept"), "text/tab-separated-values")
  })

  it("throws on non-OK", async () => {
    withFetchHandler(() => mockTextResponse("nope", { status: 500 }))

    await assert.rejects(
      () => downloadAnnotationsReport({}),
      /GET \/annotations\/report failed: 500/,
    )
  })
})

describe("stats clients", () => {
  it("getGeneStats hits /annotations/gene-stats with filter query", async () => {
    withFetchHandler(() =>
      mockJsonResponse({
        total_annotations: 1,
        summary: { genes: {} },
        categories: [],
        metrics: [],
      }),
    )

    await getGeneStats({ taxids: "9606" })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/annotations/gene-stats?taxids=9606",
    )
  })

  it("getTranscriptStats hits /annotations/transcript-stats", async () => {
    withFetchHandler(() =>
      mockJsonResponse({
        total_annotations: 0,
        summary: { types: {} },
        types: [],
        metrics: [],
      }),
    )

    await getTranscriptStats()
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/annotations/transcript-stats",
    )
  })

  it("getBuscoStats hits /annotations/busco-stats", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ total_annotations: 0, summary: {}, metrics: [] }),
    )

    await getBuscoStats({ filter: "x" })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/annotations/busco-stats?filter=x",
    )
  })

  it("getGeneCategoryMetricValues encodes path and include_annotations", async () => {
    withFetchHandler(() =>
      mockJsonResponse({
        category: "coding",
        metric: "total_count",
        values: [1],
        missing: [],
      }),
    )

    await getGeneCategoryMetricValues("coding", "total_count", {
      include_annotations: true,
    })

    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/annotations/gene-stats/coding/total_count?include_annotations=true",
    )
  })

  it("getBuscoMetricValues encodes metric and include_annotations", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ metric: "complete", values: [90] }),
    )

    await getBuscoMetricValues("complete", { include_annotations: true })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/annotations/busco-stats/complete?include_annotations=true",
    )
  })
})

describe("getAnnotationsAggregatesByTaxonRank", () => {
  it("GETs aggregates/taxons with required rank", async () => {
    withFetchHandler(() =>
      mockJsonResponse({
        fields: ["taxid", "taxon_name"],
        rows: [[1, "Mammalia"]],
      }),
    )

    await getAnnotationsAggregatesByTaxonRank("class")
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/annotations/aggregates/taxons?rank=class",
    )
  })
})

describe("upload flow", () => {
  it("uploadCustomGff POSTs FormData with file and custom_name", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ task_id: "task-1", remaining_quota: 4 }),
    )

    const file = new File(["##gff-version 3\n"], "demo.gff", {
      type: "text/plain",
    })
    const result = await uploadCustomGff(file, "My upload")

    assert.deepEqual(result, { task_id: "task-1", remaining_quota: 4 })
    const call = getFetchCalls()[0]
    assert.equal(call.method, "POST")
    assert.equal(call.url, "/annotrieve/api/v0/annotations/upload-gff")
    assert.ok(call.body instanceof FormData)
    const form = call.body as FormData
    assert.equal(form.get("custom_name"), "My upload")
    assert.ok(form.get("file") instanceof File)
  })

  it("uploadCustomGff throws on 429", async () => {
    withFetchHandler(() =>
      mockTextResponse("Daily upload limit reached", { status: 429 }),
    )

    const file = new File(["x"], "demo.gff")
    await assert.rejects(
      () => uploadCustomGff(file, "blocked"),
      /Daily upload limit reached/,
    )
  })

  it("getUploadJobStatus hits jobs path with no-store headers", async () => {
    withFetchHandler(() =>
      mockJsonResponse({ task_id: "task-1", state: "SUCCESS" }),
    )

    await getUploadJobStatus("task-1")
    const call = getFetchCalls()[0]
    assert.equal(
      call.url,
      "/annotrieve/api/v0/annotations/upload-gff/jobs/task-1",
    )
    const headers = new Headers(call.headers)
    assert.equal(headers.get("Cache-Control"), "no-cache")
    assert.equal(headers.get("Accept"), "application/json")
  })

  it("getUploadRateLimit hits rate-limit path", async () => {
    withFetchHandler(() => mockJsonResponse({ used: 1, remaining: 4 }))

    const data = await getUploadRateLimit()
    assert.deepEqual(data, { used: 1, remaining: 4 })
    assert.equal(
      getFetchCalls()[0].url,
      "/annotrieve/api/v0/annotations/upload-gff/rate-limit",
    )
  })
})
