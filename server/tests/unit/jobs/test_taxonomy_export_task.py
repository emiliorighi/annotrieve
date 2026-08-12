from unittest.mock import patch

import pytest

from jobs import taxonomy as tax_jobs

pytestmark = pytest.mark.unit


class TestTaxonomyExportTask:
    def test_export_uses_local_annotations_dir(self, monkeypatch):
        monkeypatch.setattr(tax_jobs, "ANNOTATIONS_PATH", "/data/annotations")
        with patch.object(
            tax_jobs,
            "export_flattened_taxonomy_files",
            return_value={"tsv": "ok"},
        ) as export:
            result = tax_jobs.export_flattened_taxonomy()
        export.assert_called_once_with("/data/annotations")
        assert result == {"tsv": "ok"}
