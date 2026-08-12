import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  buildSelectedFieldsParam,
  getAssemblyTsvFields,
  getExtendedTsvFields,
} from "./annotations-tsv-fields"

describe("annotations-tsv-fields", () => {
  it("getAssemblyTsvFields returns three assembly_* keys", () => {
    const fields = getAssemblyTsvFields()
    assert.equal(fields.length, 3)
    assert.deepEqual(
      fields.map((f) => f.key).sort(),
      [
        "assembly_download_url",
        "assembly_gc_percent",
        "assembly_refseq_category",
      ],
    )
  })

  it("getExtendedTsvFields excludes assembly and deprecated", () => {
    const keys = getExtendedTsvFields().map((f) => f.key)
    assert.equal(keys.includes("mapped_regions"), false)
    assert.equal(keys.some((k) => k.startsWith("assembly_")), false)
    assert.ok(keys.includes("busco_complete"))
  })

  it("buildSelectedFieldsParam joins keys or returns undefined", () => {
    assert.equal(buildSelectedFieldsParam([]), undefined)
    assert.equal(buildSelectedFieldsParam(["a", "b"]), "a,b")
    assert.equal(buildSelectedFieldsParam(["a", "", "b"]), "a,b")
  })
})
