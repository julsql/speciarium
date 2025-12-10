from django.core.management.base import BaseCommand

from main.core.backend.load_data.shared.internal.info_species import get_species_data
from main.core.backend.logger.logger import logger

from ete3 import NCBITaxa

from main.models.species import Species

# Chargement unique du NCBI local
ncbi = NCBITaxa()


class Command(BaseCommand):
    help = "Met à jour toutes les espèces de la base avec les données taxonomiques NCBI + GBIF + iNat"

    def handle(self, *args, **options):
        species_list = Species.objects.all()
        self.stdout.write(f"🔍 {species_list.count()} espèces à mettre à jour…")

        for sp in species_list:
            latin = sp.latin_name
            self.stdout.write(f"➡️ Mise à jour : {latin}")

            try:
                data = get_species_data(latin)
            except Exception as e:
                logger.error(f"Erreur pour {latin}: {e}")
                continue

            sp.genus = data.get("genus", "")
            sp.species = data.get("species", "")
            sp.french_name = data.get("french_name", "")
            sp.kingdom = data.get("kingdom", "")
            sp.class_field = data.get("class_field", "")
            sp.order_field = data.get("order_field", "")
            sp.family = data.get("family", "")

            sp.save()

        self.stdout.write(self.style.SUCCESS("✔️ Mise à jour terminée !"))
