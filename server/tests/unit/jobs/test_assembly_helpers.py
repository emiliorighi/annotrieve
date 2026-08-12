import pytest

from helpers.constants import PLACEHOLDER_DOWNLOAD_URL_PREFIX
from jobs.services.assembly import placeholder_download_url, resolution_from_summary_ftp_path

pytestmark = pytest.mark.unit


class TestAssemblyHelpers:
    def test_placeholder_download_url(self):
        url = placeholder_download_url("GCA_1")
        assert url.startswith(PLACEHOLDER_DOWNLOAD_URL_PREFIX)
        assert url.endswith("GCA_1")

    def test_resolution_na_returns_none(self):
        assert resolution_from_summary_ftp_path("na") is None
        assert resolution_from_summary_ftp_path("") is None
        assert resolution_from_summary_ftp_path("n/a") is None

    def test_resolution_http_path(self):
        res = resolution_from_summary_ftp_path(
            "https://ftp.ncbi.nlm.nih.gov/genomes/all/GCA/000/001/405/GCA_000001405.29_GRCh38"
        )
        assert res is not None
        assert res.directory_url.startswith("https://")
        assert res.download_url.endswith("_genomic.fna.gz")

    def test_resolution_relative_path(self):
        res = resolution_from_summary_ftp_path(
            "/genomes/all/GCA/000/001/405/GCA_000001405.29_GRCh38"
        )
        assert res is not None
        assert "GCA_000001405.29_GRCh38" in res.dir_name
