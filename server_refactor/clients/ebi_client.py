import requests


def get_taxon_from_ena_browser(taxon_id):
    data=None
    try:
        response = requests.get(f"https://www.ebi.ac.uk/ena/browser/api/xml/{taxon_id}") ## 
        response.raise_for_status()
        data = response.content
    except Exception as e:
        print(f"Error occurred while fetchin {taxon_id}")
        print(e)
    finally:
        return data

def get_taxon_from_ena_portal(taxon_id):
    data = None
    try:
        response = requests.get(f"https://www.ebi.ac.uk/ena/portal/api/filereport?result=taxon&accession={taxon_id}&fields=tax_lineage,scientific_name,common_name,genbank_common_name,rank&limit=10&format=json")
        response.raise_for_status()
        data = response.json()
    except Exception as e:
        print(f"Error occurred while fetchin {taxon_id}")
        print(e)
    finally:
        return data


def get_assemblies_metadata_from_ena_browser_and_store_in_file(accessions, path_to_gzipped_xml_file):
    """
    Get assemblies metadata from ENA browser, via post request up to 10k accessions at a time and store the result in a file
    return True if successful, False otherwise
    """
    payload = {"accessions": accessions, "download": True, "gzip": True}
    try:
        response = requests.post(f"https://www.ebi.ac.uk/ena/browser/api/xml", json=payload)
        response.raise_for_status()
        with open(path_to_gzipped_xml_file, "wb") as f:
            f.write(response.content)
        return True
    except Exception as e:
        print(f"Error occurred while fetching assemblies metadata from ENA browser")
        print(e)
        return False


def search_accessions_with_post_request(result, accessions, fields):
    """
    Search accessions with post request
    """
    payload = {"result": result, "accessions": accessions, "fields": fields}
    response = requests.post(f"https://www.ebi.ac.uk/ena/portal/api/search", json=payload)
    response.raise_for_status()
    return response.json()