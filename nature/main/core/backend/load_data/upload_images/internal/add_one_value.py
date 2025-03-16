from django.core.exceptions import ValidationError
from django.db import transaction

from main.core.backend.logger.logger import logger
from main.models.photo import Photos
from main.models.species import Species


@transaction.atomic
def add_specie(info_specie: dict[str, str]) -> None:
    try:
        specie = Species(
            latin_name=info_specie["latin_name"],
            genus=info_specie["genus"],
            species=info_specie["species"],
            french_name=info_specie["french_name"],
            kingdom=info_specie["kingdom"],
            class_field=info_specie["class_field"],
            order_field=info_specie["order_field"],
            family=info_specie["family"],
        )
        specie.full_clean()
        specie.save()

    except ValidationError as e:
        logger.error(info_specie)
        logger.error(f"Erreur de validation pour {info_specie['latin_name']}: {str(e)}")


@transaction.atomic
def add_photo(info_photo: dict[str, str]) -> None:
    try:
        specie = Species.objects.filter(latin_name=info_photo['latin_name']).first()
        photo = Photos(
            year=info_photo["year"],
            date=info_photo["date"],
            longitude=info_photo["longitude"],
            latitude=info_photo["latitude"],
            continent=info_photo["continent"],
            country=info_photo["country"],
            region=info_photo["region"],
            photo=info_photo["photo"],
            thumbnail=info_photo["thumbnail"],
            details=info_photo["details"],
            specie=specie,
            hash=info_photo["hash"],
        )

        photo.full_clean()
        photo.save()
    except ValidationError as e:
        logger.error(info_photo)
        logger.error(f"Erreur de validation pour {info_photo['latin_name']}: {str(e)}")
