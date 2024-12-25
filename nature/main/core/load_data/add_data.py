from django.core.exceptions import ValidationError
from django.db import transaction
from main.core.logger.logger import logger
from main.models.species import Species

@transaction.atomic
def add_data(value: list[dict[str, str]]) -> None:
    objects = []
    for row in value:
        species = Species(
            latin_name=row["latin_name"],
            genus=row["genus"],
            species=row["species"],
            french_name=row["french_name"],
            kingdom=row["kingdom"],
            class_field=row["class_field"],
            order_field=row["order_field"],
            family=row["family"],
            year=row["year"],
            date=row["date"],
            continent=row["continent"],
            country=row["country"],
            region=row["region"],
            photo=row["photo"],
            thumbnail=row["thumbnail"],
            details=row["details"],
        )
        try:
            species.full_clean()  # Validation avant création
            objects.append(species)
        except ValidationError as e:
            logger.error(row)
            logger.error(f"Erreur de validation pour {row['latin_name']}: {str(e)}")

    if objects:
        Species.objects.bulk_create(objects)
