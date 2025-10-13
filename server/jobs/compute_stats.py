#!/usr/bin/env python3
"""
Compute GFF statistics grouped into 3 categories: coding, non_coding, pseudogene

Usage:
    python3 compute_gff_stats.py <gff_url> [output_file]
    
Example:
    python3 compute_gff_stats.py "https://ftp.ebi.ac.uk/.../genes.gff3.gz" output.json
"""

import gzip
import requests
import re
import sys
import json
import sys
from collections import defaultdict
from typing import Optional
import statistics

# Precompiled regex for faster parsing
attribute_pattern = re.compile(r'([^=;]+)=([^;]+)')


class Root:
    __slots__ = ('feature_type', 'biotype', 'length', 'has_cds', 'has_exon')

    def __init__(self, feature_type: str, biotype: Optional[str], length: int):
        self.feature_type = feature_type
        self.biotype = biotype
        self.length = length
        self.has_cds = False
        self.has_exon = False


class Transcript:
    __slots__ = ('gene_id', 'type', 'exons_flat', 'exon_len_sum', 'cds_total_len', 'cds_segments')

    def __init__(self, gene_id: str, ttype: Optional[str]):
        self.gene_id = gene_id
        self.type = ttype
        self.exons_flat = []  # [start0, end0, start1, end1, ...]
        self.exon_len_sum = 0
        self.cds_total_len = 0
        self.cds_segments = 0


def parse_attributes(attr_str):
    """Parse GFF attributes into dictionary."""
    return dict(attribute_pattern.findall(attr_str))


def compute_gff_stats(gff_url: str) -> dict:
    """
    Compute statistics from a GFF3.gz URL, grouped into 3 categories using a
    streaming approach similar to compute_stats.py.

    Categories:
    - coding_stats: root features (ID, no Parent) with biotype containing 'protein_coding',
      or any descendant CDS present
    - pseudogene_stats: root features where the third column equals 'pseudogene'
    - non_coding_stats: remaining root features where descendants include at least one exon

    Returns a dict with, per category:
    - total_genes, min_length, max_length, average_length
    - total_exons, total_introns, total_cds
    - average_cds_length_per_gene (coding only; 0 otherwise)
    - For each direct child type of roots: <child_type>_count and <child_type>_per_gene
    """

    print(f"Streaming GFF from: {gff_url}")

    # Root features (no Parent) tracked here
    roots = {}  # root_id -> Root
    id_to_root = {}  # any feature id -> root id (propagated through hierarchy)

    # Track transcript-level data to compute introns and CDS per gene
    # Lightweight structure: store exon intervals to compute introns, plus running sums
    transcripts = {}  # transcript_id -> Transcript

    try:
        response = requests.get(gff_url, stream=True, timeout=120)
        response.raise_for_status()
        response.raw.decode_content = True

        with gzip.GzipFile(fileobj=response.raw) as gff_file:
            for line_bytes in gff_file:
                line = line_bytes.decode('utf-8', errors='ignore').strip()
                if not line or line.startswith('#'):
                    continue

                cols = line.split('\t')
                if len(cols) < 9:
                    continue

                try:
                    # Intern frequently repeated strings to reduce memory
                    feature_type = sys.intern(cols[2])
                    start = int(cols[3])
                    end = int(cols[4])
                    length = end - start + 1
                    attributes = parse_attributes(cols[8])

                    feature_id = attributes.get('ID')
                    parent_field = attributes.get('Parent')
                    parent_ids = parent_field.split(',') if parent_field else []
                    biotype = (
                        attributes.get('biotype') or
                        attributes.get('gene_biotype') or
                        attributes.get('transcript_biotype') or
                        None
                    )
                    if biotype is not None:
                        biotype = sys.intern(biotype)

                    # Root feature: ID present, no Parent
                    if feature_id and not parent_ids:
                        roots[feature_id] = Root(feature_type, biotype, length)
                        id_to_root[feature_id] = feature_id
                        continue

                    # Non-root: must have a parent
                    if parent_ids:
                        # Determine root gene for each parent (assume parents precede children per GFF3 convention)
                        for parent_id in parent_ids:
                            root_id = id_to_root.get(parent_id)

                            # If parent is a root, this is a direct child of root
                            if root_id and parent_id == root_id:
                                if feature_id:
                                    id_to_root[feature_id] = root_id
                                # Initialize transcript tracking for direct children (potential transcripts)
                                if feature_id and feature_type not in ('exon', 'CDS'):
                                    t = transcripts.get(feature_id)
                                    if t is None:
                                        transcripts[feature_id] = Transcript(root_id, feature_type)
                                    else:
                                        t.gene_id = root_id
                                        t.type = feature_type
                                continue

                            # If parent is not a root but already mapped to a root, propagate mapping
                            if root_id and parent_id != root_id:
                                # Handle exon/CDS accumulating under transcript parent
                                if feature_type == 'exon':
                                    # Parent is expected to be a transcript id
                                    t = transcripts.get(parent_id)
                                    if t is None:
                                        t = transcripts[parent_id] = Transcript(root_id, None)
                                    t.exons_flat.append(start)
                                    t.exons_flat.append(end)
                                    t.exon_len_sum += (end - start + 1)
                                    # Mark gene has_exon
                                    roots[root_id].has_exon = True

                                elif feature_type == 'CDS':
                                    t = transcripts.get(parent_id)
                                    if t is None:
                                        t = transcripts[parent_id] = Transcript(root_id, None)
                                    t.cds_total_len += (end - start + 1)
                                    t.cds_segments += 1
                                    # Mark gene has_cds
                                    roots[root_id].has_cds = True

                except Exception:
                    # Skip malformed lines
                    continue

        # Categorize roots
        root_to_category = {}
        for root_id, info in roots.items():
            feature_type = info.feature_type
            biotype = info.biotype or ''

            if feature_type == 'pseudogene':
                root_to_category[root_id] = 'pseudogene'
            elif info.has_cds or 'protein_coding' in biotype.lower():
                root_to_category[root_id] = 'coding'
            elif info.has_exon:
                root_to_category[root_id] = 'non_coding'
            else:
                root_to_category[root_id] = None

        # Precompute per-gene max CDS length and per-category totals (using sums, not lists)
        gene_to_max_cds = defaultdict(int)
        category_totals = {
            'coding': {'exons': 0, 'introns': 0, 'cds': 0, 'exon_len_sum': 0, 'intron_len_sum': 0, 'cds_len_sum': 0, 'cds_transcripts': 0},
            'non_coding': {'exons': 0, 'introns': 0, 'cds': 0, 'exon_len_sum': 0, 'intron_len_sum': 0, 'cds_len_sum': 0, 'cds_transcripts': 0},
            'pseudogene': {'exons': 0, 'introns': 0, 'cds': 0, 'exon_len_sum': 0, 'intron_len_sum': 0, 'cds_len_sum': 0, 'cds_transcripts': 0},
        }

        for tid, tinfo in transcripts.items():
            gene_id = tinfo.gene_id
            category = root_to_category.get(gene_id)
            if not category:
                continue

            # CDS totals
            cds_total_len = tinfo.cds_total_len
            if cds_total_len > gene_to_max_cds[gene_id]:
                gene_to_max_cds[gene_id] = cds_total_len
            category_totals[category]['cds'] += tinfo.cds_segments
            if cds_total_len > 0:
                category_totals[category]['cds_len_sum'] += cds_total_len
                category_totals[category]['cds_transcripts'] += 1

            # Exon totals
            exons_flat = tinfo.exons_flat
            exon_count = len(exons_flat) // 2
            category_totals[category]['exons'] += exon_count
            category_totals[category]['exon_len_sum'] += tinfo.exon_len_sum

            # Intron totals (compute from sorted exons)
            if exon_count > 1:
                # reconstruct tuples for sorting: [(start,end), ...]
                exons_sorted = sorted(zip(exons_flat[0::2], exons_flat[1::2]))
                for i in range(exon_count - 1):
                    intron_len = exons_sorted[i+1][0] - exons_sorted[i][1] - 1
                    if intron_len > 0:
                        category_totals[category]['introns'] += 1
                        category_totals[category]['intron_len_sum'] += intron_len

        # Build results per category
        def build_category(category_name: str) -> dict:
            # Select roots in category
            #get category name from the category_name parameter
            cat_roots = {rid: info for rid, info in roots.items() if root_to_category.get(rid) == category_name}
            if not cat_roots:
                return {}

            # Basic stats
            lengths = [info.length for info in cat_roots.values()]
            gene_count = len(cat_roots)

            # Direct child counts and per-gene averages (only transcripts with ≥1 exon)
            child_totals = defaultdict(int)
            child_counts_per_gene = defaultdict(list)  # feature_type -> list[counts for genes where >0]
            # Aggregate by scanning transcripts to avoid storing per-root sets
            # Build per-gene per-type counts and per-type exon counts
            per_gene_type_counts = defaultdict(lambda: defaultdict(int))  # gene_id -> type -> count
            type_transcripts = defaultdict(int)  # type -> total transcripts with exons
            type_exons = defaultdict(int)        # type -> total exons across those transcripts
            type_span_sum = defaultdict(int)     # type -> sum of genomic span lengths
            type_spliced_sum = defaultdict(int)  # type -> sum of spliced exon lengths
            for tid, tinfo in transcripts.items():
                if not tinfo.exons_flat:
                    continue  # must have exons
                gene_id = tinfo.gene_id
                if gene_id not in cat_roots:
                    continue
                ttype = tinfo.type
                if ttype is None:
                    continue
                per_gene_type_counts[gene_id][ttype] += 1
                type_transcripts[ttype] += 1
                exon_count_for_t = (len(tinfo.exons_flat) // 2)
                type_exons[ttype] += exon_count_for_t
                # Compute transcript genomic span and spliced length
                starts = tinfo.exons_flat[0::2]
                ends = tinfo.exons_flat[1::2]
                span_len = (max(ends) - min(starts) + 1) if ends and starts else 0
                type_span_sum[ttype] += span_len
                type_spliced_sum[ttype] += tinfo.exon_len_sum
            # Summarize per-gene into totals and per-gene lists
            for gid, type_counts in per_gene_type_counts.items():
                for ctype, cnt in type_counts.items():
                    child_totals[ctype] += cnt
                    child_counts_per_gene[ctype].append(cnt)

            # Total transcripts across types
            total_transcripts = sum(child_totals.values())

            # Totals and average lengths
            ex_total = category_totals[category_name]['exons']
            in_total = category_totals[category_name]['introns']
            cds_total = category_totals[category_name]['cds']
            ex_sum = category_totals[category_name]['exon_len_sum']
            in_sum = category_totals[category_name]['intron_len_sum']
            cds_transcripts = category_totals[category_name]['cds_transcripts']
            cds_len_sum = category_totals[category_name]['cds_len_sum']

            # Schema-compliant object
            category_obj = {
                'count': gene_count,    
                'length': {
                    'min': (min(lengths) if lengths else 0),
                    'max': (max(lengths) if lengths else 0),
                    'average': (round(sum(lengths) / len(lengths), 2) if lengths else 0),
                    'median': (statistics.median(lengths) if lengths else 0)
                },
                'transcripts': {
                    'total': total_transcripts,
                    'average_per_gene': (round(total_transcripts / gene_count, 2) if gene_count else 0),
                    'by_type': {}
                },
                'exons': {
                    'total': ex_total,                   
                    'average_length': (round(ex_sum / ex_total, 2) if ex_total else 0)
                },
                'introns': {
                    'total': in_total,
                    'average_length': (round(in_sum / in_total, 2) if in_total else 0)
                },
                'cds': {
                    'total': cds_total,
                    'average_length': (round(cds_len_sum / cds_transcripts, 2) if cds_transcripts else 0)
                }
            }

            for ctype, total in child_totals.items():
                avg_per_gene = (round(sum(child_counts_per_gene[ctype]) / len(child_counts_per_gene[ctype]), 2)
                                if child_counts_per_gene[ctype] else 0)
                avg_exons = (round(type_exons[ctype] / type_transcripts[ctype], 2)
                              if type_transcripts.get(ctype, 0) > 0 else 0)
                avg_len = (round(type_span_sum[ctype] / type_transcripts[ctype], 2)
                           if type_transcripts.get(ctype, 0) > 0 else 0)
                avg_spliced = (round(type_spliced_sum[ctype] / type_transcripts[ctype], 2)
                               if type_transcripts.get(ctype, 0) > 0 else 0)
                category_obj['transcripts']['by_type'][ctype] = {
                    'count': total,
                    'average_per_gene': avg_per_gene,
                    'average_exons': avg_exons,
                    'average_length': avg_len,
                    'average_spliced_length': avg_spliced
                }

            return category_obj

        return {
            'coding_genes': build_category('coding'),
            'non_coding_genes': build_category('non_coding'),
            'pseudogenes': build_category('pseudogene'),
        }

    except Exception as e:
        print(f"✗ Error: {str(e)}")
        return {}


if __name__ == '__main__':
    if len(sys.argv) < 2:
        print("Usage: python3 compute_gff_stats.py <gff_url> [output_file]")
        print("\nExample:")
        print('  python3 compute_gff_stats.py "https://ftp.ebi.ac.uk/.../genes.gff3.gz" stats.json')
        sys.exit(1)
    
    gff_url = sys.argv[1]
    output_file = sys.argv[2] if len(sys.argv) > 2 else 'gff_stats.json'
    
    print("=" * 90)
    print("COMPUTING GFF STATISTICS")
    print("=" * 90)
    
    stats = compute_gff_stats(gff_url)
    
    # Print summary
    print("\n" + "=" * 90)
    print("RESULTS")
    print("=" * 90)
    
    for category in ['coding_stats', 'non_coding_stats', 'pseudogene_stats']:
        if category in stats and stats[category]:
            cat_data = stats[category]
            
            print(f"\n### {category.upper().replace('_', ' ')} ###")
            print(f"  Total genes: {cat_data.get('total_genes', 0):,}")
            print(f"  Total transcripts: {cat_data.get('total_transcripts', 0):,}")
            print(f"  Total exons: {cat_data.get('total_exons', 0):,}")
            print(f"  Total introns: {cat_data.get('total_introns', 0):,}")
            
            if category == 'coding_stats':
                print(f"  Coding transcripts: {cat_data.get('coding_transcripts_count', 0):,}")
                print(f"  Avg CDS length/gene: {cat_data.get('average_cds_length_per_gene', 0):.2f} bp")
                print(f"  Avg coding trans/gene: {cat_data.get('average_coding_transcripts_per_gene', 0):.2f}")
            
            print(f"  Avg exon length: {cat_data.get('average_exon_length', 0):.2f} bp")
            print(f"  Avg intron length: {cat_data.get('average_intron_length', 0):.2f} bp")
            
            # Show top 5 gene types
            gene_types = [(k, v) for k, v in cat_data.items() if k.endswith('_count') and 'gene' in k.lower()]
            gene_types.sort(key=lambda x: x[1], reverse=True)
            
            if gene_types:
                print(f"\n  Top gene types:")
                for key, count in gene_types[:5]:
                    gene_type_name = key.replace('_count', '')
                    print(f"    {gene_type_name}: {count:,}")
    
    # Save to JSON
    with open(output_file, 'w') as f:
        json.dump(stats, f, indent=2)
    
    print(f"\n{'='*90}")
    print(f"✓ Statistics saved to: {output_file}")
    print(f"{'='*90}")

