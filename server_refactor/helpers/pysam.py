import pysam

def stream_gff_file_region(gff_file_path:str, sequence_id:str, start:int=None, end:int=None):
    """
    Stream a GFF file, using pysam.
    """
    try:
        file = pysam.TabixFile(gff_file_path)
        return file.fetch(sequence_id, start, end)
    except Exception as e:
        raise e #exception will be handled by the caller


def stream_contigs(file_path:str):
    try:
        file = pysam.TabixFile(file_path)
        for contig in file.contigs:
            yield contig + "\n"
        file.close()
    except Exception as e:
        raise e #exception will be handled by the caller