import os
from pathlib import Path

from config.settings import MEDIA_URL
from main.core.backend.load_data.shared.internal.info_photo import get_latin_name, SMALL_ROOT, VIGNETTE_ROOT, \
    VIGNETTE_PATH, delete_file_with_permission_check
from main.models.photo import Photos
from main.models.species import Species
from main.core.backend.logger.logger import logger

def delete_images(images_to_delete):
    for image_key in images_to_delete:
        try:
            image_path, image_hash = image_key.split(":")
            latin_name = get_latin_name(image_path)
            thumbnail_path = str(Path(MEDIA_URL) / VIGNETTE_PATH / image_path.lstrip("/"))
            Photos.objects.filter(hash=image_hash, thumbnail=thumbnail_path).delete()
            specie_id = Species.objects.filter(latin_name=latin_name).values_list('id', flat=True).first()
            if specie_id and not Photos.objects.filter(specie_id=specie_id).exists():
                Species.objects.filter(id=specie_id).delete()

            image_small = os.path.join(SMALL_ROOT, image_path)
            image_vignette = os.path.join(VIGNETTE_ROOT, image_path)
            delete_file_with_permission_check(image_small)
            delete_file_with_permission_check(image_vignette)
        except Exception as e:
            logger.error(f"Failed to delete image {image_key}")
            logger.error(e)
