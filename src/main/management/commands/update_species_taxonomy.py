import time

from django.core.management.base import BaseCommand
from django.db.models import Q

from main.core.backend.load_data.shared.internal.info_species import get_species_data
from main.core.backend.logger.logger import logger
from main.models.species import Species

# Seuls ces champs proviennent des APIs externes : le reste de la table (photos,
# observations, collections) n'est jamais touché par cette commande.
REMOTE_FIELDS = (
    "genus",
    "species",
    "french_name",
    "kingdom",
    "class_field",
    "order_field",
    "family",
)

# iNaturalist demande de rester sous 60 requêtes/minute et une espèce coûte deux
# appels : en dessous de 2 s on prend des 429, qui font perdre la source.
DEFAULT_DELAY = 2.0


class Command(BaseCommand):
    help = (
        "Rafraîchit la taxonomie des espèces depuis iNaturalist, GBIF et NCBI. "
        "Ne modifie que la table Species, et seulement les champs issus des APIs."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="affiche les modifications sans rien écrire en base",
        )
        parser.add_argument(
            "--only",
            nargs="+",
            metavar="NOM_LATIN",
            help="ne traite que ces espèces",
        )
        parser.add_argument(
            "--missing-only",
            action="store_true",
            help="ne traite que les espèces dont un champ taxonomique est vide",
        )
        parser.add_argument(
            "--limit",
            type=int,
            help="s'arrête après N espèces",
        )
        parser.add_argument(
            "--delay",
            type=float,
            default=DEFAULT_DELAY,
            help=f"pause entre deux espèces, en secondes (défaut : {DEFAULT_DELAY})",
        )
        parser.add_argument(
            "--allow-blank",
            action="store_true",
            help="autorise l'effacement d'une valeur déjà renseignée (désactivé par défaut, "
                 "pour qu'une API indisponible ne vide pas la base)",
        )

    def handle(self, *args, **options):
        species_list = self.select_species(options)
        total = len(species_list)
        self.stdout.write(f"🔍 {total} espèce(s) à traiter…")

        updated = unchanged = failed = 0

        for index, specie in enumerate(species_list, start=1):
            if index > 1 and options["delay"]:
                time.sleep(options["delay"])

            self.stdout.write(f"[{index}/{total}] {specie.latin_name}")

            try:
                data = get_species_data(specie.latin_name)
            except Exception as e:
                failed += 1
                logger.error(f"Erreur pour {specie.latin_name}: {e}")
                self.stdout.write(self.style.ERROR(f"    ✖ {e}"))
                continue

            changes = self.collect_changes(specie, data, options["allow_blank"])
            if not changes:
                unchanged += 1
                continue

            for field, (before, after) in changes.items():
                self.stdout.write(f"    {field} : {before or '∅'} → {after or '∅'}")

            updated += 1
            if not options["dry_run"]:
                for field, (_, after) in changes.items():
                    setattr(specie, field, after)
                specie.save(update_fields=list(changes))

        self.report(updated, unchanged, failed, options["dry_run"])

    def select_species(self, options):
        species_list = Species.objects.order_by("latin_name")

        if options["only"]:
            species_list = species_list.filter(latin_name__in=options["only"])

        if options["missing_only"]:
            blank = Q()
            for field in ("kingdom", "class_field", "order_field", "family", "french_name"):
                blank |= Q(**{field: ""})
            species_list = species_list.filter(blank)

        if options["limit"] is not None:
            # le slice est appliqué au queryset : inutile de charger toute la table
            species_list = species_list[: options["limit"]]
        return list(species_list)

    def collect_changes(self, specie, data, allow_blank):
        """Champs réellement modifiés, sous la forme {champ: (avant, après)}."""
        changes = {}
        for field in REMOTE_FIELDS:
            before = getattr(specie, field) or ""
            after = data.get(field) or ""

            if after == before:
                continue
            if not after and not allow_blank:
                # une API muette ne doit pas effacer une donnée déjà connue
                continue

            changes[field] = (before, after)
        return changes

    def report(self, updated, unchanged, failed, dry_run):
        summary = f"{updated} mise(s) à jour, {unchanged} inchangée(s), {failed} en échec"
        if dry_run:
            self.stdout.write(self.style.WARNING(f"🧪 Simulation : {summary} (rien écrit)"))
        else:
            self.stdout.write(self.style.SUCCESS(f"✔️ Terminé : {summary}"))
