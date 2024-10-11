import requests

# URL for the TSV file from GitHub
URL = "https://raw.githubusercontent.com/guigolab/genome-annotation-tracker/refs/heads/main/mapped_annotations.tsv"

HEADER={
    'name':0,
    'assembly_accession':1,
    'assembly_name':2,
    'scientific_name':2,
    'taxid':4,
    'source_link':5
}

def get_new_annotations_from_github():

    new_annotations=[]
    # Send the request to retrieve the TSV file with streaming
    with requests.get(URL, stream=True) as response:
        # Ensure the request was successful
        if response.status_code != 200:
            print(f"Failed to retrieve the file. Status code: {response.status_code}")
            return
        
        # Stream and process each line
        for line_num, line in enumerate(response.iter_lines(decode_unicode=True), start=1):
            # Skip empty lines
            if not line.strip():
                continue
                # Handle the header (first line)
            if line_num != 1:
                # Split the data line by tab and process it
                row = line.split('\t')

                annot_obj={k:row[v] for k,v in HEADER.items()}
                # check if genome annotation name already exists continue if thats the case
                new_annotations.append(annot_obj)

    return new_annotations

# def create_new_annotations(new_annotations):

# Call the function to retrieve and print the TSV content
get_annotations_from_github()
