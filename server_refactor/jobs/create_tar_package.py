from celery import shared_task
import tarfile
import os
import logging
from db.models import GenomeAnnotationQuery

logger = logging.getLogger(__name__)

@shared_task(name='create_tar_package', bind=True)
def create_tar_package(self, file_paths:list[str], parent_directory:str, query_object:GenomeAnnotationQuery):
    """
    Create a tar package of containing all annotations that match the query
    1. Get all annotations that are completed
    2. For each annotation, create a tar package
    3. Save the tar package to the database
    """
    os.makedirs(parent_directory, exist_ok=True)
    filename = f"{query_object.query_id}.tar"
    tar_path = os.path.join(parent_directory, filename)
    total_files = len(file_paths)
    meta = {
            "tar_file": filename,
            "query_id": query_object.query_id,
            "query": query_object.query_dict,
            "status": 'started',
            "message": f'Creating tar package with {total_files}'
        }
    try:
        
        if os.path.exists(tar_path):
            logger.info(f"Tar package already exists: {filename}")
            meta['status'] = 'success'
            meta['message'] = f'Tar package already exists: {filename}'
            meta['download_url'] = f"/annotations/packages/{query_object.query_id}/file"
            return meta

        self.update_state(state='STARTED', meta=meta)

        files_added = 0
        with tarfile.open(tar_path, mode="w") as tar:
            for file_path in file_paths:
                tar.add(file_path, arcname=os.path.basename(file_path))  # arcname avoids full absolute paths
                files_added += 1
                if files_added % 10 == 0:
                    meta['message'] = f'Added {files_added} of {total_files} files to tar package'
                    self.update_state(state='PROGRESS', meta=meta)
        meta['message'] = f'Successfully created tar package with {files_added} files'
        meta['status'] = 'success'
        meta['download_url'] = f"/annotations/packages/{filename}"

        self.update_state(state='SUCCESS', meta=meta)
        
        return meta
        
    except Exception as e:
        error_msg = f"Error creating tar package: {str(e)}"
        logger.error(error_msg, exc_info=True)
        
        meta['message'] = f'Error creating tar package: {str(e)}'
        meta['status'] = 'failed'
        #remove the tar file if it exists
        if os.path.exists(tar_path):
            os.remove(tar_path)
        self.update_state(state='FAILURE', meta=meta)
        
    finally:
        return meta