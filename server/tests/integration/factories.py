"""Minimal document + on-disk artifact builders for integration tests."""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Optional

from db.embedded_documents import (
    AssemblyStats,
    BuscoScore,
    FeatureOverview,
    GeneCategoryFeatureStats,
    GenericLengthStats,
    GenericTranscriptTypeStats,
    AssociatedGenesStats,
    GFFStats,
    IndexedFileInfo,
    SourceFileInfo,
)
from db.models import (
    BioProject,
    GenomeAnnotation,
    GenomeAssembly,
    Organism,
    TaxonNode,
    UsageRollup,
    UserAnalytics,
)
from helpers import assembly_sequence_files as seq_files


def _utcnow() -> datetime:
    return datetime.now(timezone.utc).replace(tzinfo=None)


def make_assembly(
    *,
    accession: str = "GCA_000001405.29",
    paired: Optional[str] = None,
    taxid: str = "9606",
    organism_name: str = "Homo sapiens",
    assembly_name: str = "GRCh38",
    **kwargs: Any,
) -> GenomeAssembly:
    defaults = dict(
        assembly_accession=accession,
        paired_assembly_accession=paired,
        assembly_name=assembly_name,
        taxid=taxid,
        organism_name=organism_name,
        taxon_lineage=[taxid, "9605", "1"],
        source_database="GenBank",
        assembly_level="chromosome",
        download_url=f"https://example.com/ftp/{accession}",
        refseq_category="reference genome",
        assembly_stats=AssemblyStats(gc_percent=41),
    )
    defaults.update(kwargs)
    return GenomeAssembly(**defaults).save()


def make_annotation(
    *,
    annotation_id: Optional[str] = None,
    assembly_accession: str = "GCA_000001405.29",
    taxid: str = "9606",
    organism_name: str = "Homo sapiens",
    provider: str = "NCBI",
    database: str = "RefSeq",
    with_stats: bool = True,
    with_busco: bool = True,
    **kwargs: Any,
) -> GenomeAnnotation:
    md5 = annotation_id or ("a" * 32)
    rel_bgz = f"{taxid}/{assembly_accession}/{database.lower()}_{md5}.gff.gz"
    source = SourceFileInfo(
        database=database,
        provider=provider,
        release_date=_utcnow(),
        url_path=f"https://example.com/{md5}.gff.gz",
        last_modified=_utcnow(),
        uncompressed_md5=md5,
    )
    indexed = IndexedFileInfo(
        bgzipped_path=rel_bgz,
        csi_path=f"{rel_bgz}.csi",
        uncompressed_md5=md5,
        file_size=1024,
    )
    summary = FeatureOverview(
        types=["gene", "exon"],
        sources=[database],
        biotypes=["protein_coding"],
        attribute_keys=["ID", "Parent"],
        has_biotype=True,
        has_cds=True,
        has_exon=True,
    )
    stats = None
    if with_stats:
        stats = GFFStats(
            gene_category_stats={
                "coding": GeneCategoryFeatureStats(
                    total_count=100,
                    length_stats=GenericLengthStats(min=10, max=1000, mean=250.0),
                ),
                "non_coding": GeneCategoryFeatureStats(
                    total_count=20,
                    length_stats=GenericLengthStats(min=5, max=500, mean=100.0),
                ),
            },
            transcript_type_stats={
                "mRNA": GenericTranscriptTypeStats(
                    total_count=80,
                    length_stats=GenericLengthStats(min=10, max=900, mean=200.0),
                    associated_genes=AssociatedGenesStats(total_count=70),
                ),
            },
        )
    busco = None
    if with_busco:
        busco = BuscoScore(
            busco_lineage="eukaryota_odb12",
            busco_version="5.0.0",
            total_count=255,
            complete=90.0,
            single_copy=80.0,
            duplicated=10.0,
            fragmented=5.0,
            missing=5.0,
        )
    doc = GenomeAnnotation(
        annotation_id=md5,
        assembly_accession=assembly_accession,
        assembly_name=kwargs.pop("assembly_name", "GRCh38"),
        organism_name=organism_name,
        taxid=taxid,
        taxon_lineage=[taxid, "9605", "1"],
        source_file_info=source,
        indexed_file_info=indexed,
        features_summary=summary,
        features_statistics=stats,
        busco=busco,
        **kwargs,
    )
    return doc.save()


def make_taxon(
    *,
    taxid: str = "9606",
    scientific_name: str = "Homo sapiens",
    parent_id: str = "9605",
    rank: str = "species",
    children: Optional[list[str]] = None,
    **kwargs: Any,
) -> TaxonNode:
    return TaxonNode(
        taxid=taxid,
        scientific_name=scientific_name,
        parent_id=parent_id,
        rank=rank,
        children=children or [],
        annotations_count=kwargs.pop("annotations_count", 1),
        assemblies_count=kwargs.pop("assemblies_count", 1),
        organisms_count=kwargs.pop("organisms_count", 1),
        **kwargs,
    ).save()


def make_organism(
    *,
    taxid: str = "9606",
    organism_name: str = "Homo sapiens",
    **kwargs: Any,
) -> Organism:
    return Organism(
        taxid=taxid,
        organism_name=organism_name,
        common_name=kwargs.pop("common_name", "human"),
        taxon_lineage=[taxid, "9605", "1"],
        **kwargs,
    ).save()


def make_bioproject(
    *,
    accession: str = "PRJNA123",
    title: str = "Example project",
    **kwargs: Any,
) -> BioProject:
    return BioProject(accession=accession, title=title, **kwargs).save()


def make_user_analytics(
    *,
    fingerprint: str = "fp1",
    country: str = "ES",
    visits_count: int = 3,
) -> UserAnalytics:
    now = _utcnow()
    return UserAnalytics(
        fingerprint=fingerprint,
        country=country,
        first_visit=now,
        last_visit=now,
        visits_count=visits_count,
    ).save()


def make_usage_rollup() -> UsageRollup:
    return UsageRollup(
        key="latest",
        as_of=_utcnow(),
        by_capability={"list_annotations": 5},
        by_capability_requests={"list_annotations": 12},
        top_assemblies=[{"id": "GCA_1", "unique_users": 2}],
        top_annotations=[],
        top_taxons=[],
    ).save()


def write_contigs_for_annotation(annotation: GenomeAnnotation, lines: Optional[list[str]] = None) -> Path:
    """Write contigs.txt and a placeholder bgzipped GFF (get_contigs requires the gz path)."""
    import helpers.file as file_helper

    rel = annotation.indexed_file_info.bgzipped_path
    path = Path(seq_files.contigs_path_for_bgzipped(rel))
    path.parent.mkdir(parents=True, exist_ok=True)
    content = "\n".join(lines or ["chr1", "chr2"]) + "\n"
    path.write_text(content)
    gff_path = Path(file_helper.get_annotation_file_path(annotation))
    gff_path.parent.mkdir(parents=True, exist_ok=True)
    if not gff_path.exists():
        gff_path.write_bytes(b"")
    return path


def write_assembly_sequence_files(
    taxid: str,
    accession: str,
    *,
    chromosomes: Optional[list[dict]] = None,
    aliases_tsv: Optional[str] = None,
) -> tuple[Path, Path]:
    chrom_path = Path(seq_files.chromosomes_path(taxid, accession))
    alias_path = Path(seq_files.chr_aliases_path(taxid, accession))
    chrom_path.parent.mkdir(parents=True, exist_ok=True)
    chrom_path.write_text(
        json.dumps(
            chromosomes
            or [
                {
                    "chr_name": "1",
                    "sequence_name": "chr1",
                    "length": 1000,
                    "sequence_role": "assembled-molecule",
                }
            ]
        )
    )
    alias_path.write_text(aliases_tsv or "chr1\t1\nchr2\t2\n")
    return chrom_path, alias_path


def write_prebuilt_flattened_tree(fmt: str = "json") -> Path:
    from helpers.flattened_taxonomy_export import get_flattened_tree_file_path

    path = Path(get_flattened_tree_file_path(fmt))
    path.parent.mkdir(parents=True, exist_ok=True)
    if fmt == "tsv":
        path.write_text("taxid\tparent_taxid\tscientific_name\n9606\t9605\tHomo sapiens\n")
    else:
        path.write_text(
            json.dumps(
                {
                    "fields": ["taxid", "parent_taxid", "scientific_name"],
                    "rows": [["9606", "9605", "Homo sapiens"]],
                }
            )
        )
    return path
