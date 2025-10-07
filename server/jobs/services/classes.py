from db.models import GenomeAnnotation, AnnotationError, Organism, TaxonNode, GenomicSequence, GenomeAssembly   
from db.embedded_documents import SourceFileInfo, PipelineInfo, AssemblyStats
import re

class AnnotationToProcess:
    """
    This class is used to map the incoming annotation data to the GenomeAnnotation model
    """
    def __init__(
        self, 
        **kwargs
    ):
        self.source_database = kwargs.get('source_database')
        self.annotation_provider = kwargs.get('annotation_provider')
        self.release_date = kwargs.get('release_date')
        self.last_modified = kwargs.get('last_modified_date')
        self.md5_checksum = kwargs.get('md5_checksum')
        self.access_url = kwargs.get('access_url')
        self.taxon_id = kwargs.get('taxon_id')
        self.organism_name = kwargs.get('organism_name')
        self.pipeline_name = kwargs.get('pipeline_name')
        self.pipeline_version = kwargs.get('pipeline_version')
        self.pipeline_method = kwargs.get('pipeline_method')
        self.assembly_accession = kwargs.get('assembly_accession')
        self.assembly_name = kwargs.get('assembly_name')

    def to_genome_annotation(self, **kwargs) -> GenomeAnnotation:
        """
        Convert the AnnotationToProcess object to a GenomeAnnotation document
        """
        source_info = SourceFileInfo(
            database=self.source_database,
            provider=self.annotation_provider,
            release_date=GenomeAnnotation.parse_iso_date(self.release_date),
            url_path=self.access_url,
            last_modified=GenomeAnnotation.parse_iso_date(self.last_modified),
            uncompressed_md5=self.md5_checksum,
        )
        if self.pipeline_name:
            source_info.pipeline = PipelineInfo(
                name=self.pipeline_name,
                version=self.pipeline_version,
                method=self.pipeline_method,
            )
        return GenomeAnnotation(
                assembly_accession=self.assembly_accession,
                assembly_name=self.assembly_name,
                taxid=self.taxon_id,
                organism_name=self.organism_name,
                source_file_info=source_info,
                **kwargs
            )     

    def to_annotation_error(self, error_message: str) -> AnnotationError:
        """
        Convert the AnnotationToProcess object to an AnnotationError document
        """
        return AnnotationError(
            assembly_accession=self.assembly_accession,
            taxid=self.taxon_id,
            organism_name=self.organism_name,
            error_message=error_message,
            url_path=self.access_url,
            source_md5=self.md5_checksum,
            release_date=self.release_date,
            last_modified=self.last_modified,
            source_database=self.source_database,
        )



class OrganismToProcess:
    """
    This class is used to map the incoming organism data to the Organism model
    """
    def __init__(
        self, 
        taxid: str,
        organism_name: str,
        common_name: str,
        taxon_lineage: list[str],
        parsed_taxon_lineage: list[TaxonNode],
    ):
        self.taxon_id = taxid
        self.organism_name = organism_name
        self.common_name = common_name
        self.taxon_lineage = taxon_lineage  
        self.parsed_taxon_lineage = parsed_taxon_lineage

    def to_organism(self) -> Organism:
        """
        Convert the OrganismToProcess object to an Organism document
        """
        return Organism(
            taxid=self.taxon_id,
            organism_name=self.organism_name,
            common_name=self.common_name,
            taxon_lineage=self.taxon_lineage
        )


class AssemblyReportSequence:
    """
    This class is used to map the incoming assembly report sequence data to the GenomicSequence model
    """
    def __init__(
        self,
        assigned_molecule: str,
        sequence_name: str,
        genbank_accn: str,
        refseq_accn: str,
        sequence_length: int,
        ucsc_style_name: str,
    ):
        self.assigned_molecule = assigned_molecule
        self.sequence_name = sequence_name
        self.genbank_accn = genbank_accn
        self.refseq_accn = refseq_accn
        self.sequence_length = sequence_length
        self.ucsc_style_name = ucsc_style_name

    def to_genomic_sequence(self, assembly_accession: str, assembly_name: str) -> GenomicSequence:
        """
        Convert the AssemblyReportSequence object to a GenomicSequence document
        """
        return GenomicSequence(
            assembly_accession=assembly_accession,
            assembly_name=assembly_name,
            sequence_name=self.sequence_name,
            chr_name=self.assigned_molecule,
            genbank_accession=self.genbank_accn,
            refseq_accession=self.refseq_accn,
            ucsc_style_name=self.ucsc_style_name,
            length=self.sequence_length,
            aliases=self.get_aliases(),
        )

    def get_aliases(self) -> list[str]:
        """
        Build a comprehensive, deduplicated list of aliases for a chromosome.
        Variants include:
        - Provided fields: ucsc_style_name, genbank_accession, refseq_accession, sequence_name, chr_name
        - Normalizations: space→underscore, lower/strip
        - Numeric variants: N, zero-padded (e.g., 01), with/without 'chr' prefix
        - Extract numeric tail from chromosome-like names (not accession IDs)
        """
        aliases_set = set()

        def add(value: str):
            if value:
                v = value.strip()
                if v:
                    aliases_set.add(v)
                    if '.' in v: #remove the version number if it exists
                        aliases_set.add(v.split('.')[0])

        # Base identifiers from record
        add(self.genbank_accn)

        add(self.refseq_accn)

        ucsc_style_name = self.ucsc_style_name
        add(self.ucsc_style_name)

        sequence_name = self.sequence_name
        add(sequence_name)

        chr_name = self.assigned_molecule
        add(chr_name)

        # Space → underscore variant for relevant fields
        if chr_name and (' ' in chr_name):
            add(chr_name.replace(' ', '_'))
        if ucsc_style_name and (' ' in ucsc_style_name):
            add(ucsc_style_name.replace(' ', '_'))
        if sequence_name and (' ' in sequence_name):
            add(sequence_name.replace(' ', '_'))
        # Only derive numeric tails from chromosome-like fields (chr_name, ucsc_style_name)
        digit_tails = set()

        if chr_name:
            m = re.search(r"(\d+)$", chr_name)
            if m:
                tail = m.group(1)
                digit_tails.add(tail)
                digit_tails.add(tail.lstrip('0') or '0')
            # pure numeric chr_name
            if chr_name.isdigit():
                digit_tails.add(chr_name)
                digit_tails.add(chr_name.lstrip('0') or '0')

        if ucsc_style_name:
            m = re.match(r"^chr_?(\d+)$", ucsc_style_name)
            if m:
                tail = m.group(1)
                digit_tails.add(tail)
                digit_tails.add(tail.lstrip('0') or '0')
        if sequence_name:
            m = re.match(r"^(\d+)$", sequence_name)
            if m:
                tail = m.group(1)
                digit_tails.add(tail)
                digit_tails.add(tail.lstrip('0') or '0')
        # Build variants for digit tails
        for d in digit_tails:
            add(d)
            if d.isdigit():
                add(d.zfill(2))
            add(f"chr{d}")
            add(f"chr_{d}")

        return list(aliases_set)

class AssemblyToProcess:
    """
    This class is used to map the incoming assembly data to the GenomeAssembly model
    """
    def __init__(
        self,
        accession: str,
        paired_accession: str|None,
        assembly_stats: dict,
        assembly_info: dict,
        organism: dict,
        source_database: str,
        **kwargs
    ):
        self.accession = accession
        self.paired_accession = paired_accession
        self.assembly_stats = assembly_stats
        self.assembly_info = assembly_info
        self.organism = organism
        self.source_database = source_database
        self.taxid = self.get_tax_id()

    def get_assembly_name(self) -> str:
        """
        Get the assembly name from the assembly info
        """
        return self.assembly_info.get('assembly_name')

    def get_organism_name(self) -> str:
        """
        Get the organism name from the organism info
        """
        return self.organism_info.get('organism_name')

    def get_tax_id(self) -> str:
        """
        Get the tax id from the organism info
        """
        return str(self.organism_info.get('tax_id'))

    def to_genome_assembly(self, lineage: list[str]) -> GenomeAssembly:
        """
        Convert the AssemblyToProcess object to a GenomeAssembly document
        """
        assembly_stats = self.assembly_stats
        taxid = self.get_tax_id()
        return GenomeAssembly(
            assembly_accession=self.accession,
            paired_assembly_accession=self.paired_accession,
            assembly_name=self.get_assembly_name(),
            organism_name=self.get_organism_name(),
            download_url=self.create_ftp_path(self.accession, self.get_assembly_name()),
            taxid=taxid,
            assembly_stats=AssemblyStats(**assembly_stats),
            source_database=self.source_database,
            taxon_lineage=lineage,
        )
