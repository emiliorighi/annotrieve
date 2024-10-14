import requests
from db.models import GenomeAnnotation,Assembly,Chromosome
from helpers import organism as organism_helper
from parsers import annotation as annotation_parser, assembly as assembly_parser
from celery import shared_task
import subprocess
import json
import time
import os
# URL for the TSV file from GitHub
URL = os.getenv('ANNOTATION_METADATA_URL')

@shared_task(name='get_annotations', ignore_result=False)
def get_annotations():
    """
        parse all annotations
        collect accession in a file
        get assembly metadata and sequence report of assemblies
        create organism and stuff for each assembly
    """
    new_annotations_matrix = f"/server/new_annotations.tsv"
    new_assemblies_file = f"/server/new_assemblies.txt"
    mt_report='/server/mt_report.jsonl'
    seq_report='/server/seq_report.jsonl'
    filtered_seqs='/server/filtered_seqs.jsonl'

    try:

        new_annotations_counter, assembly_accessions = parse_annotations_from_stream(URL, new_annotations_matrix)
        print(f"Found {new_annotations_counter} new annotations")
        if new_annotations_counter == 0:
            return
        existing_assemblies = Assembly.objects(accession__in=list(assembly_accessions)).scalar('accession')
        new_assemblies = [acc for acc in list(assembly_accessions) if acc not in existing_assemblies]
        print(f"Found {len(new_assemblies)} new assemblies")
        if new_assemblies:
            saved_accession = handle_new_assemblies(new_assemblies, new_assemblies_file,mt_report,seq_report)
            print(f"A total of {len(saved_accession)} assemblies saved out of {len(new_assemblies)} new assemblies")
        saved_names = handle_annotations(new_annotations_matrix)
        print(f"A total of {len(saved_names)} out of {new_annotations_counter} have been saved!")

    except Exception as e:
        print(e)
    finally:
        for file in [new_annotations_matrix, new_assemblies_file, mt_report, seq_report,filtered_seqs]:
            if os.path.exists(file):
                os.remove(file)

def handle_annotations(new_annotations_matrix):
    saved_annotations_names = []
    with open(new_annotations_matrix, 'r') as new_ann_file:
        # Skip the header (read the first line and do nothing with it)
        next(new_ann_file)
        
        # Iterate over the remaining lines
        for line in new_ann_file:
            # Strip the newline character and split by tab
            row = line.strip().split('\t')
            annotation_object = annotation_parser.parse_annotation(row)
            assembly = Assembly.objects(accession=annotation_object.assembly_accession).first()
            if not assembly:
                print(f"Assembly {annotation_object.assembly_accession} not found for {annotation_object.name}")
                continue

            annotation_object.taxon_lineage = assembly.taxon_lineage
            annotation_object.save()
            saved_annotations_names.append(annotation_object.name)
    return saved_annotations_names

def stream_jsonl(file_path):
    """
    Stream and parse a JSONL (JSON Lines) file line by line as a generator.
    """
    with open(file_path, 'r') as f:
        for line in f:
            if line.strip():  # Skip empty lines
                yield json.loads(line)

def write_to_file(list, input_file):
    with open(input_file, 'w') as f:
        for elem in list:
            f.write(elem+'\n')

def get_mt_report(new_assemblies_file, mt_report):
    try:
        run_ncbi_datasets_cli(new_assemblies_file, mt_report, ['--inputfile', new_assemblies_file ,'--as-json-lines'])
    except Exception as e:
        raise e

def get_sequences(new_assemblies, new_assemblies_file, seq_report):
    counter=0
    #Get Sequence Reports in chunks and append to seq_report file
    valid_accessions=[]
    for ass in new_assemblies:
        if counter==2:
            break
        try:
            run_ncbi_datasets_cli(new_assemblies_file, seq_report, args=[ass, '--as-json-lines','--report','sequence'])
            time.sleep(1)
            counter+=1
            valid_accessions.append(ass)
        except Exception as e:
            print(e)
            continue
    return valid_accessions

def handle_new_assemblies(new_assemblies, new_assemblies_file, mt_report, seq_report):

    write_to_file(new_assemblies, new_assemblies_file)
    #Get Metadata Report
    get_mt_report(new_assemblies_file, mt_report)

    valid_accessions = get_sequences(new_assemblies, new_assemblies_file, seq_report)

    saved_accession=[]
    for assembly_dict in stream_jsonl(mt_report):

        assembly_object = assembly_parser.parse_assembly_from_ncbi_datasets(assembly_dict)
        if assembly_object.accession not in valid_accessions:
            continue

        chromosomes=[]
        #filter assembly sequences
        for seq in stream_jsonl(seq_report):
            if seq.get('assembly_accession') == assembly_object.accession and seq.get('role') == 'assembled-molecule':
                acc_ver = seq.get('genbank_accession')
                chromosomes.append(Chromosome(accession_version=acc_ver, **seq))

        print(f"Found a total of {len(chromosomes)} chromosomes for Assembly {assembly_object.accession}")
        if not chromosomes:
            print('Skipping assembly')
            continue

        organism = organism_helper.handle_organism(assembly_object.taxid)
        if not organism:
            print(f"Organisms {assembly_object.scientific_name} with taxid {assembly_object.taxid} not found in INSDC")
            print('Skipping assembly')
            continue

        assembly_object.taxon_lineage = organism.taxon_lineage

        existing_chromosomes = Chromosome.objects(accession_version__in=[chr.accession_version for chr in chromosomes]).scalar('accession_version')
        new_chromosomes = [new_chr for new_chr in chromosomes if new_chr.accession_version not in existing_chromosomes]

        if new_chromosomes:
            print(f"Found a total of new {len(new_chromosomes)} Chromosomes for Assembly {assembly_object.accession}")
            Chromosome.objects.insert(new_chromosomes)  

        assembly_object.save()
        saved_accession.append(assembly_object.accession)

    return saved_accession

def run_ncbi_datasets_cli(new_assemblies_file, report_output_file, args):
    # Open the new_assemblies_file and pass its content to the datasets CLI via stdin
    with open(new_assemblies_file, 'r') as infile:
        process = subprocess.run(
            ['datasets', 'summary', 'genome', 'accession', *args],
            stdin=infile,  # Pass the file content to stdin
            stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True
        )
    # Check for errors
    if process.returncode == 0:
        # Save the CLI output to the specified report file
        with open(report_output_file, 'a') as outfile:
            outfile.write(process.stdout)
        print(f"NCBI datasets report saved to {report_output_file}")
    else:
        print(f"Error executing NCBI datasets CLI: {process.stderr}")
        raise Exception(f"NCBI datasets CLI failed with error: {process.stderr}")

def parse_annotations_from_stream(url, new_annotations_file):
    new_annotations_counter = 0
    assembly_accessions = set()
    # Send the request to retrieve the TSV file with streaming
    with requests.get(url, stream=True) as response:
        # Ensure the request was successful
        response.raise_for_status()
        # Open the new_annotations_file to write the filtered lines
        with open(new_annotations_file, 'w') as f:
            # Stream through each line of the file
            for line_num, line in enumerate(response.iter_lines(decode_unicode=True), start=1):
                # Skip empty lines
                if not line.strip():
                    continue

                # Skip the header (first line)
                if line_num == 1:
                    continue

                # Split the line by tab to process the data
                row = line.split('\t')
                
                # Ensure there is at least one column (check row size)
                if len(row) < 1:
                    continue

                # Extract the annotation name from the first column
                ann_name = row[0]
                ass_acc = row[1]

                # Check if this annotation already exists in the database
                if GenomeAnnotation.objects(name=ann_name).first():
                    continue

                # Write the filtered line to the new file
                f.write(line + '\n')  # Add a newline character after writing
                new_annotations_counter+=1
                assembly_accessions.add(ass_acc)
    return new_annotations_counter, assembly_accessions

def split_into_chunks(lst, chunk_size):
    # Yield successive chunks from the list
    for i in range(0, len(lst), chunk_size):
        yield lst[i:i + chunk_size]

# @shared_task(name='get_annotations', ignore_result=False)
# def get_annotations():

#     ensembl_counter=0
#     # Send the request to retrieve the TSV file with streaming
#     with requests.get(URL, stream=True) as response:
#         # Ensure the request was successful
#         if response.status_code != 200:
#             print(f"Failed to retrieve the file. Status code: {response.status_code}")
#             return

#         # Stream and process each line
#         for line_num, line in enumerate(response.iter_lines(decode_unicode=True), start=1):


#             if ensembl_counter == 10:
#                 break

#             if 'ftp.ncbi' in line:
#                 continue

#             if 'ftp.ensembl' in line:
#                 ensembl_counter += 1
            
#             print(line)
#             if not line.strip():
#                 continue
#                 # Handle the header (first line)
#             if line_num != 1:

#                 try:
#                 # Split the data line by tab and process it
#                     row = line.split('\t')
#                     annot_obj=annotation_parser.parse_annotation(row)

#                     if GenomeAnnotation.objects(name=annot_obj.name).first():
#                         continue

#                     organism = handle_organism(annot_obj)
#                     if not organism:
#                         continue
                    
#                     assembly = handle_assembly(annot_obj,organism)
#                     if not assembly:
#                         continue

#                     annot_obj.taxon_lineage = organism.taxon_lineage
#                     annot_obj.save()

#                 except Exception as e:
#                     raise e
#                     # print(e)
                

# def handle_organism(ass_obj):
#     organism = organism_helper.handle_organism(ass_obj.taxid)
#     if organism:
#         return organism
#     print(f"Organisms {ass_obj.scientific_name} with taxid {ass_obj.taxid} not found in INSDC")


# def handle_assembly(annot_obj, organism):
#     assembly = Assembly.objects(accession=annot_obj.assembly_accession).first()
#     if assembly:
#         return assembly
    
#     assembly = assembly_helper.get_assembly_from_ncbi(annot_obj.assembly_accession)
    
#     if not assembly:
#         print(f"Assembly {annot_obj.assembly_name} with accession {annot_obj.assembly_accession} not found in INSDC")
#         return
    
#     assembly_helper.save_chromosomes(assembly)

#     assembly.taxon_lineage = organism.taxon_lineage
#     assembly.save()
#     return assembly
