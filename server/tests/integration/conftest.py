"""Integration fixtures: mongomock DB, temp annotations dir, eager Celery."""

from __future__ import annotations

import os
from pathlib import Path
from typing import Iterator
from unittest.mock import patch

import pytest
from mongoengine import connect, disconnect

# Override parent unit conftest redis defaults (setdefault would not win).
os.environ["DB_NAME"] = "annotrieve_integration"
os.environ["DB_HOST"] = "localhost"
os.environ["DB_PORT"] = "27017"
os.environ["DB_USER"] = "test"
os.environ["DB_PASS"] = "test"
os.environ["CELERY_BROKER_URL"] = "memory://"
os.environ["CELERY_RESULT_BACKEND"] = "cache+memory://"
os.environ["AUTH_KEY"] = "test-auth-key"
os.environ["IP_FINGERPRINT_SECRET"] = "test-ip-fingerprint-secret"
os.environ.setdefault(
    "LOCAL_ANNOTATIONS_DIR", "/tmp/annotrieve-integration-annotations"
)

# Settings may already be imported by the root conftest path — keep in sync.
try:
    from configs.app_settings import settings as _settings

    _settings.CELERY_BROKER_URL = "memory://"
    _settings.CELERY_RESULT_BACKEND = "cache+memory://"
except Exception:
    pass


def _connect_mongomock() -> None:
    """Replace real Mongo with in-process mongomock."""
    try:
        disconnect(alias="default")
    except Exception:
        pass
    connect(db=os.environ["DB_NAME"], host="mongomock://localhost", alias="default")


def _configure_eager_celery(celery_app) -> None:
    celery_app.conf.task_always_eager = True
    celery_app.conf.task_eager_propagates = True
    celery_app.conf.task_store_eager_result = True
    celery_app.conf.broker_url = "memory://"
    celery_app.conf.result_backend = "cache+memory://"


def _clear_collections() -> None:
    from db.models import (
        AnnotationError,
        AnnotationSequenceMap,
        BioProject,
        GenomeAnnotation,
        GenomeAssembly,
        GenomicSequence,
        Organism,
        TaxonNode,
        UploadRateLimit,
        UsageRollup,
        UserAnalytics,
        ZenodoOAuthSession,
    )

    for model in (
        GenomeAssembly,
        Organism,
        AnnotationSequenceMap,
        GenomicSequence,
        AnnotationError,
        GenomeAnnotation,
        TaxonNode,
        BioProject,
        UserAnalytics,
        UsageRollup,
        UploadRateLimit,
        ZenodoOAuthSession,
    ):
        try:
            model.objects.delete()
        except Exception:
            pass


@pytest.fixture
def annotations_dir(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> Path:
    """Per-test LOCAL_ANNOTATIONS_DIR (disk artifacts + uploads)."""
    root = tmp_path / "annotations"
    root.mkdir()
    monkeypatch.setenv("LOCAL_ANNOTATIONS_DIR", str(root))
    import importlib

    import helpers.assembly_sequence_files as seq_files
    import helpers.file as file_helper
    import jobs.taxonomy as tax_jobs

    imp = importlib.import_module("jobs.import_annotations")

    monkeypatch.setattr(seq_files, "ANNOTATIONS_PATH", str(root))
    monkeypatch.setattr(file_helper, "ANNOTATIONS_PATH", str(root))
    monkeypatch.setattr(tax_jobs, "ANNOTATIONS_PATH", str(root))
    monkeypatch.setattr(imp, "ANNOTATIONS_PATH", str(root))
    return root


@pytest.fixture
def app(annotations_dir: Path):
    """FastAPI app with mongomock + eager Celery (real persistence, no Redis)."""
    with patch("main.connect_to_db", side_effect=_connect_mongomock):
        with patch("db.database.connect_to_db", side_effect=_connect_mongomock):
            with patch(
                "celery_app.celery_worker.connect_to_db",
                side_effect=_connect_mongomock,
            ):
                from main import create_app

                application = create_app()
                _configure_eager_celery(application.celery_app)

                from celery_app.celery_worker import app as worker_app

                _configure_eager_celery(worker_app)

                from jobs.taxonomy import export_flattened_taxonomy
                from jobs.upload_gff import compute_custom_gff_stats

                for task in (compute_custom_gff_stats, export_flattened_taxonomy):
                    try:
                        task.app = worker_app
                    except Exception:
                        pass
                    if getattr(task, "app", None) is not None:
                        _configure_eager_celery(task.app)

                _connect_mongomock()
                _clear_collections()
                yield application
                _clear_collections()
                try:
                    disconnect(alias="default")
                except Exception:
                    pass


@pytest.fixture
def client(app) -> Iterator:
    from fastapi.testclient import TestClient

    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture
def auth_headers() -> dict[str, str]:
    return {"X-Auth-Key": os.environ["AUTH_KEY"]}
