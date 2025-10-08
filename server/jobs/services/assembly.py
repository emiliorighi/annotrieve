import os
from db.models import GenomeAssembly, AssemblyStats, GenomicSequence
from clients import ncbi_datasets as ncbi_datasets_client
from .classes import AnnotationToProcess, AssemblyReportSequence, AssemblyToProcess
from .utils import create_batches
import asyncio
import aiohttp
from typing import Iterator

def get_existing_accessions(accessions: list[str]) -> list[str]:
    """
    Get all the accessions that already exist in the database
    """
    return GenomeAssembly.objects(assembly_accession__in=accessions).scalar('assembly_accession')

def get_assembly_report_path(accession: str, assembly_name: str) -> str:
    assembly_name = assembly_name.replace(' ', '_')
    return f"https://ftp.ncbi.nlm.nih.gov/genomes/all/{accession[0:3]}/{accession[4:7]}/{accession[7:10]}/{accession[10:13]}/{accession}_{assembly_name}/{accession}_{assembly_name}_assembly_report.txt"

def handle_assemblies(annotations: list[AnnotationToProcess], tmp_dir: str, valid_lineages: dict[str, list[str]], batch_size: int=5000) -> list[str]:
    """
    Fetch assemblies from the accessions, save the new ones and return the list of valid assemblies accessions
    """
    all_accessions = set([annotation.assembly_accession for annotation in annotations])
    existing_accessions = get_existing_accessions(list(all_accessions))
    new_accessions = all_accessions - set(existing_accessions)
    if not new_accessions:
        return existing_accessions
    
    print(f"Found {len(new_accessions)} new assemblies to fetch")
    saved_accessions = fetch_new_assemblies(list(new_accessions), tmp_dir, valid_lineages, batch_size)
    if not saved_accessions:
        return existing_accessions
    
    print(f"Saved {len(saved_accessions)} new assemblies")
    chrless_assemblies = GenomeAssembly.objects(assembly_accession__in=saved_accessions).scalar('assembly_accession', 'assembly_name')
    acc_to_name = {assembly_accession: assembly_name for assembly_accession, assembly_name in chrless_assemblies}
    report_paths = [
        (get_assembly_report_path(assembly_accession, assembly_name), assembly_accession) 
        for assembly_accession, assembly_name in chrless_assemblies
    ]
    print(f"Fetching {len(report_paths)} assembly reports")
    fetched_data = asyncio.run(fetch_data_many(report_paths, get_assembly_report))
    print(f"Fetched {len(fetched_data)} assembly reports")
    save_chromosomes(fetched_data, acc_to_name, batch_size)
    
    return get_existing_accessions(all_accessions)

def fetch_new_assemblies(new_accessions: list[str], tmp_dir: str, valid_lineages: dict[str, list[str]], batch_size: int=5000) -> list[str]:
    """
    Fetch the new assemblies from the accessions and save them. Return the list of saved accessions
    """
    saved_accessions = []
    batches = create_batches(new_accessions, batch_size)
    for idx, batch in enumerate(batches):
        assemblies_path = os.path.join(tmp_dir, f'assemblies_{idx}_{len(batch)}.txt')
        with open(assemblies_path, 'w') as f:
            for assembly in batch: 
                f.write(assembly + '\n')
        cmd = ['genome', 'accession', '--inputfile', assemblies_path]
        ncbi_report = ncbi_datasets_client.get_data_from_ncbi(cmd)
        assemblies_to_save: list[GenomeAssembly] = [
            parse_assembly_from_ncbi(assembly, valid_lineages) 
            for assembly in ncbi_report.get('reports', [])
        ]
        if not assemblies_to_save:
            print(f"No assemblies found in {assemblies_path} from NCBI, continuing...")
            continue
        found_accessions = [assembly.assembly_accession for assembly in assemblies_to_save]
        try:
            GenomeAssembly.objects.insert(assemblies_to_save)
            saved_accessions.extend(found_accessions)
        except Exception as e:
            print(f"Error upserting assembly batch: {e}")
            #delete the assemblies that were saved
            GenomeAssembly.objects(assembly_accession__in=found_accessions).delete()
            continue
    return saved_accessions

def save_chromosomes(chromosomes_tuples: list[tuple[str, list[AssemblyReportSequence]]], acc_to_name: dict[str, str], batch_size: int=5000):
    """
    Save the chromosomes to the database in batches, delete the assemblies and chromosomes with errors
    """
    chrs_to_save = []
    for assembly_accession, fetched_data in chromosomes_tuples:
        assembly_name = acc_to_name[assembly_accession]
        for sequence in fetched_data:
            chr_doc = sequence.to_genomic_sequence(assembly_accession, assembly_name)
            chrs_to_save.append(chr_doc)
    if not chrs_to_save:
        return

    for batch in create_batches(chrs_to_save, batch_size):
        related_assembly_accessions = list(set([chr_doc.assembly_accession for chr_doc in batch]))
        try:
            GenomicSequence.objects.insert(batch)
        except Exception as e:
            #delete the assemblies and chromosomes with errors
            GenomeAssembly.objects(assembly_accession__in=related_assembly_accessions).delete()
            GenomicSequence.objects(assembly_accession__in=related_assembly_accessions).delete()
            print(f"Error upserting chromosome batch: {e}")
            continue

async def parse_assembly_report_stream(resp: aiohttp.ClientResponse) -> list[AssemblyReportSequence]:
    """
    Stream and parse the assembly report without loading the entire response in memory.
    """
    assembled_rows: list[AssemblyReportSequence] = []
    header_cols: list[str] | None = None

    def normalize_header(line: str) -> list[str]:
        normalized = (
            line.lstrip("#").strip().lower()
            .replace(" ", "_")
            .replace("-", "_")
            .replace("/", "_")
        )
        return normalized.split("\t")

    def clean_value(value: str) -> str:
        v = value.strip()
        if v in ("NA", "na"):
            return ""
        return v

    while True:
        raw_line_bytes = await resp.content.readline()
        if not raw_line_bytes:
            break
        raw_line = raw_line_bytes.decode("utf-8", errors="replace")
        if raw_line is None:
            continue
        line = raw_line.rstrip("\n")
        if not line:
            continue

        if line.startswith("#"):
            cols = normalize_header(line)
            if "sequence_role" in cols and "sequence_name" in cols:
                header_cols = cols
            continue

        if not header_cols:
            continue

        cols = line.split("\t")
        if not 'assembled-molecule' in cols:
            continue

        row = {h: clean_value(v) for h, v in zip(header_cols, cols)}

        try:
            sequence_length_str = row.get("sequence_length", "").replace(",", "")
            sequence_length = int(sequence_length_str) if sequence_length_str else 0
            assembled_rows.append(
                AssemblyReportSequence(
                    assigned_molecule=row.get("assigned_molecule", ""),
                    genbank_accn=row.get("genbank_accn", ""),
                    refseq_accn=row.get("refseq_accn", ""),
                    sequence_length=sequence_length,
                    ucsc_style_name=row.get("ucsc_style_name", ""),
                    sequence_name=row.get("sequence_name", ""),
                )
            )
        except Exception:
            continue

    return assembled_rows

def parse_assembly_report(line_iterator: Iterator[str]) -> list[AssemblyReportSequence]:
    assembled_rows: list[AssemblyReportSequence] = []
    header_cols: list[str] | None = None

    def normalize_header(line: str) -> list[str]:
        # Remove leading '#', lowercase, replace spaces/dashes/slashes with underscore, split by tab
        normalized = (
            line.lstrip("#").strip().lower()
            .replace(" ", "_")
            .replace("-", "_")
            .replace("/", "_")
        )
        return normalized.split("\t")

    def clean_value(value: str) -> str:
        v = value.strip()
        if v in ("NA", "na"):
            return ""
        return v

    for raw_line in line_iterator:
        if raw_line is None:
            continue
        line = raw_line.rstrip("\n")
        if not line:
            continue

        if line.startswith("#"):
            # Only treat as a data header if it's a tabbed header with the expected columns
            cols = normalize_header(line)
            if "sequence_role" in cols and "sequence_name" in cols:
                header_cols = cols
            continue

        if not header_cols:
            # Skip until a valid header is found
            continue

        cols = line.split("\t")
        if not 'assembled-molecule' in cols:
            continue

        # Zip will naturally ignore extra columns and missing trailing columns
        row = {h: clean_value(v) for h, v in zip(header_cols, cols)}

        try:
            sequence_length_str = row.get("sequence_length", "").replace(",", "")
            sequence_length = int(sequence_length_str) if sequence_length_str else 0
            assembled_rows.append(
                AssemblyReportSequence(
                    assigned_molecule=row.get("assigned_molecule", ""),
                    genbank_accn=row.get("genbank_accn", ""),
                    refseq_accn=row.get("refseq_accn", ""),
                    sequence_length=sequence_length,
                    ucsc_style_name=row.get("ucsc_style_name", ""),
                    sequence_name=row.get("sequence_name", ""),
                )
            )
        except Exception:
            # Skip malformed rows
            continue
    return assembled_rows

async def fetch_data_many(
    tuples: list[tuple[str, str]], 
    fetch_func: callable, 
    concurrency: int = 20
) -> list[tuple[str, list[AssemblyReportSequence]]]:
    """
    Generic function to fetch data for multiple URLs with concurrency control.
    
    Args:
        tuples: List of (url, unique identifier) tuples
        fetch_func: Async function that takes (session, url) and returns data
        concurrency: Maximum number of concurrent requests
    
    Returns:
        List of (unique identifier, data) tuples for successful requests
    """
    results = []
    sem = asyncio.Semaphore(concurrency)
    
    async with aiohttp.ClientSession() as session:
        async def bound_fetch(session, url, unique_identifier):
            async with sem:
                data = await fetch_func(session, url)
                if data:
                    results.append((unique_identifier, data))
        
        await asyncio.gather(*(bound_fetch(session, url, unique_identifier) for url, unique_identifier in tuples))
    
    return results


async def get_assembly_report(session: aiohttp.ClientSession, ftp_path: str) -> list[AssemblyReportSequence]:
    """
    This function fetches the and parses the assembly report from ncbi ftp server.
    """
    try:
        async with session.get(ftp_path) as resp:
            if resp.status != 200:
                return None
            return await parse_assembly_report_stream(resp)
    except Exception:
        return None

def create_ftp_path(accession: str, assembly_name: str) -> str:
    assembly_name = assembly_name.replace(' ', '_')
    return f"https://ftp.ncbi.nlm.nih.gov/genomes/all/{accession[0:3]}/{accession[4:7]}/{accession[7:10]}/{accession[10:13]}/{accession}_{assembly_name}/{accession}_{assembly_name}_genomic.fna.gz"



def parse_assembly_from_ncbi(assembly_dict: dict, valid_lineages: dict[str, list[str]]) -> GenomeAssembly:
    assembly_stats = assembly_dict.get('assembly_stats', dict())
    assembly_info = assembly_dict.get('assembly_info', dict())
    organism_info = assembly_dict.get('organism', dict())
    return GenomeAssembly(
        assembly_accession=assembly_dict.get('accession'),
        paired_assembly_accession=assembly_dict.get('paired_accession'),
        assembly_name=assembly_info.get('assembly_name'),
        organism_name=organism_info.get('organism_name'),
        taxid=str(organism_info.get('tax_id')),
        download_url=create_ftp_path(assembly_dict.get('accession'), assembly_info.get('assembly_name')),
        assembly_stats=AssemblyStats(**assembly_stats),
        source_database=assembly_dict.get('source_database'),
        taxon_lineage=valid_lineages.get(str(organism_info.get('tax_id')), []),
        release_date=assembly_info.get('release_date'),
        submitter=assembly_dict.get('submitter'),
    )