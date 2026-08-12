import { describe, it } from "node:test"
import assert from "node:assert/strict"
import {
  TERMINAL_JOB_STATES,
  annotationFromJson,
  getLoadingLabel,
  getUploadHeaderPhase,
  taskResultToAnnotation,
} from "./custom-upload-session"
import type { UploadSession } from "@/lib/stores/custom-annotations"
import { EMPTY_UPLOAD_SESSION } from "@/lib/stores/custom-annotations"

function session(patch: Partial<UploadSession> = {}): UploadSession {
  return { ...EMPTY_UPLOAD_SESSION, ...patch }
}

const summary = { genes: { coding: 1 } } as never

describe("getUploadHeaderPhase", () => {
  it("returns confirm when session has result", () => {
    assert.equal(
      getUploadHeaderPhase(
        session({
          result: {
            kind: "custom",
            annotation_id: "abc",
            custom_name: "x",
            uploaded_md5: "abc",
            uploaded_at: "2026-01-01",
            uploaded_file_size: 1,
            features_summary: summary,
          },
        }),
        false,
      ),
      "confirm",
    )
  })

  it("returns loading while submitting or job in flight", () => {
    assert.equal(getUploadHeaderPhase(session(), true), "loading")
    assert.equal(
      getUploadHeaderPhase(session({ jobId: "t1", jobState: "STARTED" }), false),
      "loading",
    )
  })

  it("returns error for FAILURE/REVOKED", () => {
    assert.equal(
      getUploadHeaderPhase(session({ jobId: "t1", jobState: "FAILURE" }), false),
      "error",
    )
    assert.equal(
      getUploadHeaderPhase(session({ jobId: "t1", jobState: "REVOKED" }), false),
      "error",
    )
  })

  it("returns idle when no job", () => {
    assert.equal(getUploadHeaderPhase(session(), false), "idle")
  })
})

describe("TERMINAL_JOB_STATES", () => {
  it("includes SUCCESS, FAILURE, REVOKED", () => {
    assert.ok(TERMINAL_JOB_STATES.has("SUCCESS"))
    assert.ok(TERMINAL_JOB_STATES.has("FAILURE"))
    assert.ok(TERMINAL_JOB_STATES.has("REVOKED"))
    assert.equal(TERMINAL_JOB_STATES.has("STARTED"), false)
  })
})

describe("taskResultToAnnotation / annotationFromJson", () => {
  it("maps task result to custom annotation", () => {
    const ann = taskResultToAnnotation(
      {
        annotation_id: "md5a",
        features_summary: summary,
        indexed_file_info: { uncompressed_md5: "md5a", file_size: 12 },
        computed_at: "2026-02-01T00:00:00Z",
      },
      "My upload",
    )
    assert.equal(ann.kind, "custom")
    assert.equal(ann.annotation_id, "md5a")
    assert.equal(ann.custom_name, "My upload")
    assert.equal(ann.uploaded_file_size, 12)
  })

  it("annotationFromJson throws without md5/summary", () => {
    assert.throws(
      () => annotationFromJson({ annotation_id: "x" }, "n"),
      /features_summary/,
    )
  })

  it("annotationFromJson happy path", () => {
    const ann = annotationFromJson(
      {
        annotation_id: "md5b",
        features_summary: summary,
        indexed_file_info: { uncompressed_md5: "md5b", file_size: 3 },
      },
      "Named",
    )
    assert.equal(ann.annotation_id, "md5b")
    assert.equal(ann.custom_name, "Named")
  })
})

describe("getLoadingLabel", () => {
  it("prefers submitting, then step, then state", () => {
    assert.equal(getLoadingLabel(session(), true), "Uploading…")
    assert.equal(
      getLoadingLabel(session({ jobStep: "parse_gff" }), false),
      "Computing… (parse gff)",
    )
    assert.equal(
      getLoadingLabel(session({ jobState: "PENDING" }), false),
      "Computing… (PENDING)",
    )
  })
})
