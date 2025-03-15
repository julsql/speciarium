import os

from main.core.backend.load_data.shared.internal.info_photo import get_latin_name, SMALL_PATH, VIGNETTE_PATH
from main.models.photo import Photos
from main.models.species import Species
from main.core.backend.logger.logger import logger

def delete_images(images_to_delete):
    for image_key in images_to_delete:
        try:
            image_path, image_hash = image_key.split(":")
            latin_name = get_latin_name(image_path)
            Photos.objects.filter(hash=image_hash, thumbnail=f"/media/main/images/vignettes/{image_path}").delete()
            specie_id = Species.objects.filter(latin_name=latin_name).values_list('id', flat=True).first()
            if specie_id and not Photos.objects.filter(specie_id=specie_id).exists():
                Species.objects.filter(id=specie_id).delete()

            image_small = os.path.join(SMALL_PATH, image_path)
            image_vignette = os.path.join(VIGNETTE_PATH, image_path)
            delete_file_with_permission_check(image_small)
            delete_file_with_permission_check(image_vignette)
        except Exception as e:
            logger.error(f"Failed to delete image {image_key}")
            logger.error(e)

def delete_file_with_permission_check(file_path):
    try:
        if os.path.exists(file_path):
            if os.access(file_path, os.W_OK):
                os.remove(file_path)
                logger.info(f"Le fichier {file_path} a été supprimé avec succès.")
            else:
                logger.warning(f"Permissions insuffisantes pour supprimer le fichier {file_path}.")
        else:
            logger.warning(f"Le fichier {file_path} n'existe pas.")
    except Exception as e:
        logger.error(f"Erreur : {e}")
