from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.test import TestCase

from main.management.commands.update_species_taxonomy import DEFAULT_DELAY
from main.models.species import Species

COMMAND = "update_species_taxonomy"
API_PATH = "main.management.commands.update_species_taxonomy.get_species_data"

GREENFINCH = {
    "latin_name": "Chloris chloris",
    "genus": "Chloris",
    "species": "chloris",
    "french_name": "Verdier d'Europe",
    "kingdom": "Animalia",
    "class_field": "Aves",
    "order_field": "Passeriformes",
    "family": "Fringillidae",
}

# les seuls champs que la commande a le droit de toucher
TAXONOMY = {key: value for key, value in GREENFINCH.items() if key != "latin_name"}


def create_species(latin_name, **fields):
    defaults = {
        "genus": latin_name.split(" ")[0],
        "species": "",
        "french_name": "",
        "kingdom": "",
        "class_field": "",
        "order_field": "",
        "family": "",
    }
    return Species.objects.create(latin_name=latin_name, **{**defaults, **fields})


class UpdateSpeciesTaxonomyTests(TestCase):
    def call(self, *args, api=None, **kwargs):
        out = StringIO()
        with patch(API_PATH, **({"side_effect": api} if callable(api) else {"return_value": api})):
            call_command(COMMAND, *args, delay=0, stdout=out, stderr=out, **kwargs)
        return out.getvalue()

    def test_taxonomy_is_written(self):
        specie = create_species("Chloris chloris")

        self.call(api=GREENFINCH)

        specie.refresh_from_db()
        self.assertEqual(specie.kingdom, "Animalia")
        self.assertEqual(specie.class_field, "Aves")
        self.assertEqual(specie.order_field, "Passeriformes")
        self.assertEqual(specie.family, "Fringillidae")
        self.assertEqual(specie.french_name, "Verdier d'Europe")

    def test_wrong_class_is_corrected(self):
        # le cas qui a motivé la commande : un verdier classé chez les plantes
        specie = create_species(
            "Chloris chloris", kingdom="Plantae", class_field="Liliopsida",
            order_field="Poales", family="Poaceae",
        )

        output = self.call(api=GREENFINCH)

        specie.refresh_from_db()
        self.assertEqual(specie.kingdom, "Animalia")
        self.assertEqual(specie.family, "Fringillidae")
        self.assertIn("Poaceae → Fringillidae", output)

    def test_dry_run_writes_nothing(self):
        specie = create_species("Chloris chloris", kingdom="Plantae")

        output = self.call("--dry-run", api=GREENFINCH)

        specie.refresh_from_db()
        self.assertEqual(specie.kingdom, "Plantae")
        self.assertIn("Simulation", output)

    def test_a_silent_api_never_blanks_existing_data(self):
        specie = create_species("Chloris chloris", **TAXONOMY)

        self.call(api={key: "" for key in GREENFINCH})

        specie.refresh_from_db()
        self.assertEqual(specie.family, "Fringillidae")
        self.assertEqual(specie.french_name, "Verdier d'Europe")

    def test_allow_blank_clears_the_fields(self):
        specie = create_species("Chloris chloris", family="Poaceae")

        self.call("--allow-blank", api={key: "" for key in GREENFINCH})

        specie.refresh_from_db()
        self.assertEqual(specie.family, "")

    def test_unchanged_species_are_reported_as_such(self):
        create_species("Chloris chloris", **TAXONOMY)

        output = self.call(api=GREENFINCH)

        self.assertIn("0 mise(s) à jour, 1 inchangée(s)", output)

    def test_only_filters_on_latin_name(self):
        create_species("Chloris chloris")
        untouched = create_species("Vulpes vulpes")

        self.call("--only", "Chloris chloris", api=GREENFINCH)

        untouched.refresh_from_db()
        self.assertEqual(untouched.kingdom, "")

    def test_missing_only_skips_complete_species(self):
        create_species("Chloris chloris", **TAXONOMY)
        incomplete = create_species("Vulpes vulpes", kingdom="Animalia")

        output = self.call("--missing-only", api=GREENFINCH)

        self.assertIn("1 espèce(s) à traiter", output)
        self.assertIn(incomplete.latin_name, output)

    def test_limit_caps_the_run(self):
        create_species("Chloris chloris")
        create_species("Vulpes vulpes")

        output = self.call("--limit", "1", api=GREENFINCH)

        self.assertIn("1 espèce(s) à traiter", output)

    def test_limit_zero_processes_nothing(self):
        create_species("Chloris chloris")

        output = self.call("--limit", "0", api=GREENFINCH)

        self.assertIn("0 espèce(s) à traiter", output)

    def test_a_failing_species_does_not_stop_the_others(self):
        create_species("Aaa aaa")
        second = create_species("Zzz zzz")

        def api(latin_name):
            if latin_name == "Aaa aaa":
                raise OSError("boom")
            return GREENFINCH

        output = self.call(api=api)

        second.refresh_from_db()
        self.assertEqual(second.family, "Fringillidae")
        self.assertIn("1 en échec", output)

    def test_default_delay_respects_the_inaturalist_rate_limit(self):
        # 2 appels iNaturalist par espèce, plafond 60 req/min -> 2 s minimum
        calls_per_minute = 2 * 60 / DEFAULT_DELAY
        self.assertLessEqual(calls_per_minute, 60)
