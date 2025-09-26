from clients.ncbi_datasets import stream_jsonlines_from_ncbi
import os
def handle_assemblies(new_assembly_accessions):
    """
    Handle assemblies with rate limiting for API calls.
    return the number of assemblies saved
    """
    #get the assemblies from ncbi
    #write temp file with the assembly accessions
    with open('temp_assembly_accessions.txt', 'w') as f:
        for assembly_accession in new_assembly_accessions:
            f.write(assembly_accession + '\n')

    #pass the temp file to the ncbi command
    CMD = ["genome", "accession", "--inputfile", "temp_assembly_accessions.txt", "--report", "assembly"]

    try:
        for assembly in stream_jsonlines_from_ncbi(CMD):
            assembly_obj = parse_assembly(assembly)
            assembly_obj.save()
    except Exception as e:
        print(f"Error saving assemblies: {e}")
        raise e
    finally:
        os.remove('temp_assembly_accessions.txt')