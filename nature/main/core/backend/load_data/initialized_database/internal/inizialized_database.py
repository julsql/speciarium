from main.core.backend.load_data.initialized_database.internal.add_all_values import add_species, add_photos
from main.core.backend.load_data.initialized_database.internal.get_all_values import get_dataset_on_each_image, \
    get_all_species_data


def initialized_database() -> None:
    info_photo = get_dataset_on_each_image()
    latin_name_list = list({value['latin_name'] for value in info_photo})
    info_species = get_all_species_data(latin_name_list)
    add_species(info_species)
    add_photos(info_photo)
