import pysam

def stream_gff_file_region(file_path:str, sequence_id:str, start:int=None, end:int=None, index_format:str="csi"):
    with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
        for line in file.fetch(sequence_id, start, end):
            yield line  

def stream_region_with_filters(file_path:str, sequence_id:str, start:int=None, end:int=None, feature_type:str | None=None, index_format:str="csi"):
    with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
        for line in file.fetch(sequence_id, start, end):
            fields = line.split("\t")
            if fields[2] != feature_type:
                continue
            yield line + '\n'

def stream_contigs(file_path:str, index_format:str="csi"):
    with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
        for contig in file.contigs:
            yield contig + '\n'

def stream_tabix_gff_file(file_path:str, index_format:str="csi"):
    
    with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
        for line in file.fetch():
            yield line

def stream_header(file_path:str, index_format:str="csi"):
    with pysam.TabixFile(file_path, index=f"{file_path}.{index_format}") as file:
        for line in file.header:
            yield line + '\n'

