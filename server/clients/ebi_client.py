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