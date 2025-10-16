import pysam


def stream_gff_file(file_path:str, index_format:str="csi", seqid:str=None, start:int=None, end:int=None, feature_type:str | None=None, feature_source:str | None=None, biotype:str | None=None):
    has_filters = feature_type or feature_source or biotype
    if has_filters:
        with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
            for line in file.fetch(seqid, start, end):
                fields = line.split("\t", 8)
                if feature_type and fields[2] != feature_type:
                    continue
                if feature_source and fields[1] != feature_source:
                    continue
                if biotype:
                    attributes = {k: v for k, v in (item.split('=') for item in fields[8].split(';') if '=' in item)}
                    if biotype not in attributes.values():
                        continue
                yield line + '\n'
    else:
        with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
            for line in file.fetch(seqid, start, end):
                yield line + '\n'

def stream_contigs(file_path:str, index_format:str="csi"):
    with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
        for contig in file.contigs:
            yield contig + '\n'

def stream_tabix_gff_file(file_path:str, index_format:str="csi"):
    
    with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
        for line in file.fetch():
            yield line


