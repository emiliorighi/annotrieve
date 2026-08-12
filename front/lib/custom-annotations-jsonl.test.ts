import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  applyJsonlImportPreview,
  parseCustomAnnotationRecord,
  previewCustomAnnotationsJsonlImport,
  serializeCustomAnnotationsToJsonl,
} from "./custom-annotations-jsonl"
import type { CustomAnnotation } from "@/lib/types"

const summary = {
  root_type_counts: {},
  attribute_keys: [],
  types: ["gene"],
  sources: ["custom"],
  biotypes: [],
  root_types: [],
  types_missing_id: [],
  has_biotype: false,
  has_cds: false,
  has_exon: false,
}

function custom(id: string, name = "Mine"): CustomAnnotation {
  return {
    kind: "custom",
    annotation_id: id,
    custom_name: name,
    uploaded_md5: id,
    uploaded_at: "2026-01-01T00:00:00.000Z",
    uploaded_file_size: 10,
    features_summary: summary,
  }
}

describe("serializeCustomAnnotationsToJsonl", () => {
  it("serializes one object per line", () => {
    const text = serializeCustomAnnotationsToJsonl([custom("a"), custom("b")])
    const lines = text.split("\n")
    assert.equal(lines.length, 2)
    assert.equal(JSON.parse(lines[0]).annotation_id, "a")
  })
})

describe("parseCustomAnnotationRecord", () => {
  it("accepts a valid custom annotation", () => {
    const result = parseCustomAnnotationRecord(custom("md5x") as unknown as Record<string, unknown>)
    assert.equal(result.ok, true)
    if (result.ok) assert.equal(result.annotation.annotation_id, "md5x")
  })

  it("rejects incomplete records", () => {
    const result = parseCustomAnnotationRecord({ annotation_id: "x" })
    assert.equal(result.ok, false)
  })
})

describe("preview + apply duplicate strategies", () => {
  it("classifies new vs duplicate; skip vs overwrite", () => {
    const existing = custom("dup", "Old")
    const text = [
      JSON.stringify(custom("new1")),
      JSON.stringify(custom("dup", "Incoming")),
    ].join("\n")

    const preview = previewCustomAnnotationsJsonlImport(
      text,
      new Map([["dup", existing]]),
    )
    assert.equal(preview.newAnnotations.length, 1)
    assert.equal(preview.duplicates.length, 1)

    const added: CustomAnnotation[] = []
    const skip = applyJsonlImportPreview(preview, "skip", (a) => added.push(a))
    assert.equal(skip.imported, 1)
    assert.equal(skip.skippedDuplicates, 1)
    assert.equal(skip.overwritten, 0)

    const overwritten: CustomAnnotation[] = []
    const overwrite = applyJsonlImportPreview(preview, "overwrite", (a) =>
      overwritten.push(a),
    )
    assert.equal(overwrite.imported, 1)
    assert.equal(overwrite.overwritten, 1)
    assert.equal(overwrite.skippedDuplicates, 0)
  })
})
