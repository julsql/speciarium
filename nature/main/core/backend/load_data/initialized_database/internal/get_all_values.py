import os

from config.settings import BASE_DIR
from main.core.backend.load_data.initialized_database.internal.create_images import create_images
from main.core.backend.load_data.shared.internal.info_photo import get_info, images_in_folder
from main.core.backend.load_data.shared.internal.info_species import get_species_data
from main.core.backend.logger.logger import logger
from main.models.species import Species

PHOTO_PATH = os.path.join(BASE_DIR, 'originales')


def get_dataset_on_each_image() -> list[dict[str, str]]:
    all_image_path = images_in_folder(PHOTO_PATH)
    return get_dataset_from_images_path(all_image_path, f"{PHOTO_PATH}/")


def get_all_species_data(latin_name_list: list[str]) -> list[dict[str, str]]:
    species_already_added = list(Species.objects.values_list('latin_name', flat=True))
    info_species = []
    i = 0
    for latin_name in latin_name_list:
        if latin_name not in species_already_added:
            try:
                specie = get_species_data(latin_name)
                info_species.append(specie)
                species_already_added.append(specie['latin_name'])
            except Exception as e:
                logger.error(e)
        print(f"espèce {i} : {latin_name}")
        logger.info(f"espèce {i} : {latin_name}")
        i += 1
    return info_species




def get_dataset_from_images_path(images_path, path_to_remove) -> list[dict[str, str]]:
    logger.info(f"Nombre d'images {len(images_path)}")
    info_photo = []
    i = 0
    for image_path in images_path:
        try:
            photo = get_info(image_path, path_to_remove)
            create_images(image_path, path_to_remove)
            info_photo.append(photo)
        except Exception as e:
            logger.error(e)

        logger.info(f"image {i}")
        i += 1
    return info_photo
