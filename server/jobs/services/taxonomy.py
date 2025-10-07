from db.models import TaxonNode, Organism
from clients import ebi_client
from lxml import etree
from .classes import AnnotationToProcess, OrganismToProcess
import os
from .utils import create_batches
import gzip
from itertools import chain

def get_existing_lineages_dict(annotations: list[AnnotationToProcess])->dict[str, list[str]]:
    """
    Get the existing lineages for the taxids in the annotations. return a dict of taxid:lineage (from species to root)
    """
    all_taxids = set([annotation.taxon_id for annotation in annotations])
    existing_organisms = Organism.objects(taxid__in=list(all_taxids)).scalar('taxid','taxon_lineage')
    lineages = {taxid:lineage for taxid, lineage in existing_organisms}
    return lineages

def handle_taxonomy(annotations: list[AnnotationToProcess], tmp_dir: str, batch_size: int=9000) -> dict:
    """
    Fetch the taxonomy from the a list of AnnotationToProcess and store the lineages in a dictionary taxid:lineage, return the lineages dict
    """    
    lineages = get_existing_lineages_dict(annotations)
    input_taxids = {annotation.taxon_id for annotation in annotations}
    new_taxids = input_taxids - set(lineages.keys())
    if not new_taxids:
        return lineages

    print(f"Found {len(new_taxids)} new organisms to fetch")
    organisms_to_process = fetch_new_organisms(list(new_taxids), tmp_dir, batch_size)
    # save all the related taxons and return the list of taxids of saved taxons
    saved_taxids = save_organisms(organisms_to_process, batch_size)
    if not saved_taxids:
        return lineages

    print(f"Saved {len(saved_taxids)} new organisms")
    successfully_saved_organisms = [organism for organism in organisms_to_process if organism.taxon_id in saved_taxids]
    
    print("Saving taxonomies")
    save_taxons(successfully_saved_organisms)

    organisms_to_update = Organism.objects(taxid__in=saved_taxids)
    for organism in organisms_to_update:
        ordered_taxons = get_ordered_taxons(organism.taxon_lineage)
        update_taxon_hierarchy(ordered_taxons)

    lineages = get_existing_lineages_dict(annotations)
    return lineages #return all the valid lineages


def fetch_new_organisms(taxids: list[str], tmp_dir: str, batch_size: int=9000)->list[OrganismToProcess]:
    """
    Fetch new organisms from ENA browser in bulk (up to 10k taxids at a time) and parse them into OrganismToProcess objects
    """
    batches = create_batches(taxids, batch_size)
    organisms_to_process = []
    for idx, batch in enumerate(batches):
        # Use index in filename to avoid collisions when different batches have same length
        path_to_gzipped_xml_file = os.path.join(tmp_dir, f'taxons_{idx}_{len(batch)}.xml.gz')
        fetch_success = ebi_client.get_xml_from_ena_browser(batch, path_to_gzipped_xml_file)
        if not fetch_success or not os.path.exists(path_to_gzipped_xml_file) or os.path.getsize(path_to_gzipped_xml_file) == 0:
            continue

        organisms_to_process.extend(
            parse_taxons_and_organisms_from_ena_browser(path_to_gzipped_xml_file)
        )
        # Best-effort cleanup to save disk space
        try:
            os.remove(path_to_gzipped_xml_file)
        except Exception:
            pass
    return organisms_to_process

def save_organisms(organisms_to_process: list[OrganismToProcess], batch_size: int=5000)->list[str]:
    """
    Save new organisms and return the list of taxids of saved organisms (those with a lineage successfully saved)
    """
    organisms_to_save = [organism.to_organism() for organism in organisms_to_process]
    batches = create_batches(organisms_to_save, batch_size)
    saved_taxids = []
    for batch in batches:
        taxids_in_batch = [organism.taxid for organism in batch]
        try:
            Organism.objects.insert(batch)
            saved_taxids.extend(taxids_in_batch)
        except Exception as e:
            print(f"Error saving organisms: {e}")
            Organism.objects(taxid__in=taxids_in_batch).delete()
            continue
    
    return saved_taxids

def save_taxons(organisms_to_process: list[OrganismToProcess], batch_size: int=5000)->bool | list[str]:
    """
    Save new taxons and return the list of taxids of saved taxons
    """
    all_taxids = set(chain(*[organism.taxon_lineage for organism in organisms_to_process]))
    existing_taxids = set(TaxonNode.objects(taxid__in=list(all_taxids)).scalar('taxid'))
    new_taxids = all_taxids - existing_taxids

    # Deduplicate by taxid while keeping the first occurrence
    unique_taxons_by_taxid = {}
    for organism in organisms_to_process:
        for taxon in organism.parsed_taxon_lineage:
            if taxon.taxid in new_taxids and taxon.taxid not in unique_taxons_by_taxid:
                unique_taxons_by_taxid[taxon.taxid] = taxon

    taxons_to_save = list(unique_taxons_by_taxid.values())
    batches = create_batches(taxons_to_save, batch_size)
    saved_taxids = []
    for batch in batches:
        taxids_in_batch = [taxon.taxid for taxon in batch]
        try:
            TaxonNode.objects.insert(batch)
            saved_taxids.extend(taxids_in_batch)
        except Exception as e:
            print(f"Error saving taxons: {e}")
            TaxonNode.objects(taxid__in=taxids_in_batch).delete()
            Organism.objects(taxon_lineage__in=taxids_in_batch).delete()
            continue
        
    print(f"Total taxons saved: {len(saved_taxids)}")

def get_ordered_taxons(taxids: list[str])->list[TaxonNode]:
    """
    Reload taxons from database and return them ordered by lineage from species to root
    """
    reloaded_taxons = TaxonNode.objects(taxid__in=taxids)
    taxon_map = {t.taxid: t for t in reloaded_taxons}
    return [taxon_map[t] for t in taxids]


def update_taxon_hierarchy(ordered_taxons: list[TaxonNode]):
    """
    Update the taxon hierarchy in a best-effort manner, add the children to the father taxon
    """
    for index in range(len(ordered_taxons) - 1):
        child_taxon = ordered_taxons[index]
        father_taxon = ordered_taxons[index + 1]
        father_taxon.modify(add_to_set__children=child_taxon.taxid)


def parse_taxons_and_organisms_from_ena_browser(xml_path: str)->list[OrganismToProcess]:
    """
    Parse taxons from ENA browser XML file and return a tuple of list of organisms (with ordered taxon lineages from species to root) and dictionary of taxon lineages
    """
    parsed_organisms = []
    with gzip.open(xml_path, "rb") as f:
        context = etree.iterparse(f, events=("end",), tag="taxon")
        if not context:
            return parsed_organisms
        
        for _, elem in context:
            if elem.getparent().tag == "TAXON_SET":
                # Top-level taxon
                organism_taxid = str(elem.get("taxId"))
                organism_info = OrganismToProcess(
                    taxid=organism_taxid,
                    organism_name=elem.get("scientificName"),
                    common_name=elem.get("commonName"),
                    taxon_lineage=[],
                    parsed_taxon_lineage=[]
                )
                #add the organism to the taxon node
                organism_info.taxon_lineage.append(organism_taxid)
                organism_info.parsed_taxon_lineage.append(TaxonNode(
                    taxid=organism_taxid,
                    scientific_name=organism_info.organism_name,
                    rank="organism"
                ))
                # Collect lineage children
                lineage_elem = elem.find("lineage")
                if lineage_elem is not None:
                    for lt in lineage_elem.findall("taxon"):
                        taxid = str(lt.get("taxId"))
                        #we suppose this are ordered from species to root
                        if lt.get("scientificName") == "root":
                            continue
                        organism_info.taxon_lineage.append(taxid)
                        organism_info.parsed_taxon_lineage.append(TaxonNode(
                            taxid=taxid, 
                            scientific_name=lt.get("scientificName"), 
                            rank=lt.get("rank") if lt.get("rank") else "other"
                        ))

                parsed_organisms.append(organism_info)

    return parsed_organisms
