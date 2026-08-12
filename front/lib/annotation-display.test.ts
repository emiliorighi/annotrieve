import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  mergeFavoriteAnnotations,
  migrateToCustomAnnotation,
  migrateToPortalAnnotation,
  remoteFavoriteIds,
  toPortalAnnotation,
} from "./annotation-display"
import type { CustomAnnotation, PortalAnnotation } from "@/lib/types"

const summary = { genes: { coding: 1 } } as never

function portal(id: string, name = "Org"): PortalAnnotation {
  return {
    kind: "portal",
    annotation_id: id,
    taxid: "9606",
    taxon_lineage: [],
    organism_name: name,
    assembly_accession: "GCA_1",
    assembly_name: "asm",
    source_file_info: {
      database: "RefSeq",
      provider: "NCBI",
      last_modified: "2020-01-01",
      uncompressed_md5: id,
      pipeline: { name: "x", version: "1", method: "m" },
      release_date: "2020-01-01",
      source_database: "RefSeq",
    },
    indexed_file_info: {
      uncompressed_md5: id,
      file_size: 1,
      bgzipped_path: "/x",
      csi_path: "/x.csi",
      processed_at: "2020-01-01T00:00:00Z",
      pipeline: { name: "x", version: "1", method: "m" },
    },
    features_summary: summary,
  }
}

function custom(id: string, name = "Custom"): CustomAnnotation {
  return {
    kind: "custom",
    annotation_id: id,
    custom_name: name,
    uploaded_md5: id,
    uploaded_at: "2026-01-01T00:00:00Z",
    uploaded_file_size: 10,
    features_summary: summary,
  }
}

describe("remoteFavoriteIds", () => {
  it("filters out custom ids", () => {
    assert.deepEqual(
      remoteFavoriteIds(["a", "b", "c"], new Set(["b"])),
      ["a", "c"],
    )
  })
})

describe("mergeFavoriteAnnotations", () => {
  it("dedupes remote+cart+custom; custom only if in cart; custom wins", () => {
    const remote = [portal("r1"), portal("shared", "Remote")]
    const cart = [portal("c1"), custom("shared", "From cart"), custom("only-custom")]
    const customs = [custom("shared", "From store"), custom("orphaned")]
    const merged = mergeFavoriteAnnotations(cart, remote, customs)
    const byId = Object.fromEntries(merged.map((a) => [a.annotation_id, a]))

    assert.ok(byId.r1)
    assert.ok(byId.c1)
    assert.equal(byId.shared.kind, "custom")
    assert.equal((byId.shared as CustomAnnotation).custom_name, "From store")
    assert.ok(byId["only-custom"])
    assert.equal(byId.orphaned, undefined)
  })
})

describe("migrateToPortalAnnotation / migrateToCustomAnnotation", () => {
  it("accepts minimal valid portal payload", () => {
    const migrated = migrateToPortalAnnotation({
      annotation_id: "p1",
      organism_name: "Homo sapiens",
      features_summary: summary,
      source_file_info: { database: "RefSeq", url: "u", last_modified: "t" },
    })
    assert.ok(migrated)
    assert.equal(migrated!.kind, "portal")
    assert.equal(migrated!.organism_name, "Homo sapiens")
  })

  it("rejects incomplete portal payload", () => {
    assert.equal(
      migrateToPortalAnnotation({ annotation_id: "p1", features_summary: summary }),
      null,
    )
  })

  it("accepts minimal valid custom payload", () => {
    const migrated = migrateToCustomAnnotation({
      kind: "custom",
      annotation_id: "c1",
      features_summary: summary,
      custom_name: "Mine",
    })
    assert.ok(migrated)
    assert.equal(migrated!.kind, "custom")
  })

  it("rejects incomplete custom payload", () => {
    assert.equal(migrateToCustomAnnotation({ annotation_id: "c1" }), null)
  })
})

describe("toPortalAnnotation", () => {
  it("accepts portal shape and rejects incomplete", () => {
    const ann = toPortalAnnotation({
      annotation_id: "p1",
      organism_name: "Homo sapiens",
      features_summary: summary,
      source_file_info: { database: "RefSeq", url: "u", last_modified: "t" },
    })
    assert.ok(ann)
    assert.equal(ann!.kind, "portal")
    assert.equal(toPortalAnnotation(null), null)
    assert.equal(
      toPortalAnnotation({ annotation_id: "x", features_summary: summary }),
      null,
    )
  })

  it("coerces minimal organism_name + summary to portal", () => {
    const ann = toPortalAnnotation({
      annotation_id: "loose",
      organism_name: "Org",
      features_summary: summary,
    })
    assert.ok(ann)
    assert.equal(ann!.kind, "portal")
  })
})
