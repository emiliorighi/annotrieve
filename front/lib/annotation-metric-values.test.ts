import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  extractAnnotationMetricValue,
  filterFiniteMetricValues,
  meanOf,
  medianOf,
} from "./annotation-metric-values"
import type { AnnotationBase } from "@/lib/types"

const summary = {
  root_type_counts: {},
  attribute_keys: [],
  types: ["gene"],
  sources: ["RefSeq"],
  biotypes: [],
  root_types: [],
  types_missing_id: [],
  has_biotype: false,
  has_cds: true,
  has_exon: true,
}

function annotation(stats: AnnotationBase["features_statistics"], busco?: Record<string, number>): AnnotationBase & { busco?: Record<string, number> } {
  return {
    annotation_id: "a1",
    features_summary: summary,
    features_statistics: stats,
    busco,
  }
}

describe("extractAnnotationMetricValue", () => {
  it("reads gene category total_count with aliases", () => {
    const ann = annotation({
      gene_category_stats: {
        coding_genes: { total_count: 42, length_stats: { mean: 100 } },
      },
    })
    assert.equal(
      extractAnnotationMetricValue(ann, "genes", "coding", "total_count"),
      42,
    )
    assert.equal(
      extractAnnotationMetricValue(ann, "genes", "coding", "average_mean_length"),
      100,
    )
  })

  it("reads transcript type metrics", () => {
    const ann = annotation({
      transcript_type_stats: {
        mRNA: {
          total_count: 7,
          length_stats: { mean: 50 },
          associated_genes: { total_count: 3 },
          exon_stats: {
            total_count: 10,
            length: { mean: 20 },
            concatenated_length: { mean: 200 },
          },
          cds_stats: {
            total_count: 5,
            length: { mean: 15 },
            concatenated_length: { mean: 150 },
          },
        },
      },
    })
    assert.equal(
      extractAnnotationMetricValue(ann, "transcripts", "mRNA", "total_count"),
      7,
    )
    assert.equal(
      extractAnnotationMetricValue(
        ann,
        "transcripts",
        "mRNA",
        "associated_genes_total_count",
      ),
      3,
    )
  })

  it("reads busco metrics", () => {
    const ann = annotation(undefined, { complete: 95.5, missing: 1 })
    assert.equal(extractAnnotationMetricValue(ann, "busco", "", "complete"), 95.5)
    assert.equal(extractAnnotationMetricValue(ann, "busco", "", "missing"), 1)
    assert.equal(extractAnnotationMetricValue(ann, "busco", "", "unknown"), null)
  })
})

describe("filterFiniteMetricValues / meanOf / medianOf", () => {
  it("filters non-finite values", () => {
    assert.deepEqual(
      filterFiniteMetricValues([1, "x", NaN, Infinity, 2, null]),
      [1, 2],
    )
  })

  it("meanOf and medianOf handle empty and populated", () => {
    assert.equal(meanOf([]), null)
    assert.equal(medianOf([]), null)
    assert.equal(meanOf([2, 4, 6]), 4)
    assert.equal(medianOf([1, 3, 2]), 2)
    assert.equal(medianOf([1, 2, 3, 4]), 2.5)
  })
})
