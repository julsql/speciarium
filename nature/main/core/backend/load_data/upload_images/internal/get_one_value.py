from asgiref.sync import sync_to_async

from main.core.backend.load_data.shared.internal.info_photo import get_info
from main.core.backend.load_data.shared.internal.info_species import get_species_data
from main.core.backend.logger.logger import logger
from main.models.species import Species

def get_photo_value(metadata, collection_id):
    datetime = ""
    if 'datetime' in metadata:
        datetime = metadata['datetime']
    image_hash = metadata.get('hash')
    path = metadata.get('filepath')
    latitude = metadata.get('latitude')
    longitude = metadata.get('longitude')
    return get_info(path, "", collection_id, datetime, latitude, longitude, image_hash)

async def get_specie_data(latin_name: str) -> dict[str, str] | None:
    species_already_added = await sync_to_async(list, thread_sensitive=True)(
        Species.objects.values_list('latin_name', flat=True)
    )
    if latin_name not in species_already_added:
        try:
            specie = get_species_data(latin_name)
            print(f"espèce : {latin_name}")
            logger.info(f"espèce : {latin_name}")
            return specie
        except Exception as e:
            print(e)
            logger.error(e)
