from unittest.mock import patch

from django.test import SimpleTestCase

from main.core.backend.load_data.shared.internal import info_species

# Toutes les fixtures ci-dessous reprennent des réponses réelles des trois sources.

# https://api.gbif.org/v1/species/match?name=Chloris chloris&verbose=true
# Chloris chloris est un homonyme : le verdier d'Europe (Fringillidae) et une Poaceae.
GBIF_AMBIGUOUS_MATCH = {
    "confidence": 100,
    "note": "Multiple equal matches for Chloris chloris",
    "matchType": "NONE",
    "synonym": False,
    "alternatives": [
        {
            "usageKey": 11212714,
            "canonicalName": "Chloris chloris",
            "rank": "SPECIES",
            "confidence": 115,
            "matchType": "EXACT",
            "kingdom": "Plantae",
            "phylum": "Tracheophyta",
            "order": "Poales",
            "family": "Poaceae",
            "genus": "Chloris",
            "class": "Liliopsida",
        },
        {
            "usageKey": 5845582,
            "canonicalName": "Chloris chloris",
            "rank": "SPECIES",
            "confidence": 115,
            "matchType": "EXACT",
            "kingdom": "Animalia",
            "phylum": "Chordata",
            "order": "Passeriformes",
            "family": "Fringillidae",
            "genus": "Chloris",
            "class": "Aves",
        },
    ],
}

GBIF_BIRD_MATCH = {
    "usageKey": 5845582,
    "canonicalName": "Chloris chloris",
    "rank": "SPECIES",
    "confidence": 100,
    "matchType": "EXACT",
    "kingdom": "Animalia",
    "order": "Passeriformes",
    "family": "Fringillidae",
    "class": "Aves",
}

# https://api.inaturalist.org/v1/taxa?q=Chloris chloris&locale=fr
INAT_RESULTS = [
    {
        "id": 145356,
        "rank": "genus",
        "name": "Chloris",
        "matched_term": "Chloris",
        "preferred_common_name": "Verdiers",
        "english_common_name": "Greenfinches",
        "iconic_taxon_name": "Aves",
    },
    {
        "id": 145360,
        "rank": "species",
        "name": "Chloris chloris",
        "matched_term": "Chloris chloris",
        "preferred_common_name": "Verdier d'Europe",
        "english_common_name": "European Greenfinch",
        "iconic_taxon_name": "Aves",
    },
    {
        "id": 58371,
        "rank": "species",
        "name": "Cynodon dactylon",
        "matched_term": "Chloris cynodon",
        "preferred_common_name": "Chiendent pied-de-poule",
        "iconic_taxon_name": "Plantae",
    },
]

# https://api.inaturalist.org/v1/taxa/<id>?locale=fr — la recherche ne renvoie pas
# la lignée, seul l'appel sur le taxon expose `ancestors`.
INAT_DETAILS = {
    145360: {
        "id": 145360, "rank": "species", "name": "Chloris chloris",
        "ancestors": [
            {"rank": "kingdom", "name": "Animalia"},
            {"rank": "phylum", "name": "Chordata"},
            {"rank": "class", "name": "Aves"},
            {"rank": "order", "name": "Passeriformes"},
            {"rank": "family", "name": "Fringillidae"},
        ],
    },
    # le serpent que GBIF range en classe « Squamata » et NCBI en « Lepidosauria »
    1631566: {
        "id": 1631566, "rank": "species", "name": "Natrix natrix",
        "ancestors": [
            {"rank": "kingdom", "name": "Animalia"},
            {"rank": "phylum", "name": "Chordata"},
            {"rank": "class", "name": "Reptilia"},
            {"rank": "order", "name": "Squamata"},
            {"rank": "family", "name": "Colubridae"},
        ],
    },
    # recherche sur une famille : le rang recherché est le taxon lui-même
    26141: {
        "id": 26141, "rank": "family", "name": "Colubridae",
        "ancestors": [
            {"rank": "kingdom", "name": "Animalia"},
            {"rank": "class", "name": "Reptilia"},
            {"rank": "order", "name": "Squamata"},
        ],
    },
}

class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def fake_inaturalist(search_results):
    """Sert la recherche puis le détail du taxon sur la même fonction requests.get."""

    def get(url, **kwargs):
        if url == info_species.INATURALIST_API_URL:
            return FakeResponse({"results": search_results})
        taxon_id = int(url.rsplit("/", 1)[1])
        return FakeResponse({"results": [INAT_DETAILS[taxon_id]]})

    return get


class NormalizeTests(SimpleTestCase):
    def test_regular_name_is_untouched(self):
        self.assertEqual(info_species.normalize_query_name("Chloris chloris"), "Chloris chloris")

    def test_genus_only_name_is_untouched(self):
        self.assertEqual(info_species.normalize_query_name("Chloris"), "Chloris")

    def test_undetermined_species_falls_back_to_the_genus(self):
        # « Genre x » = espèce indéterminée (230 entrées du catalogue)
        self.assertEqual(info_species.normalize_query_name("Gehyra x"), "Gehyra")
        self.assertEqual(info_species.normalize_query_name("Gehyra X"), "Gehyra")


class InaturalistTaxonTests(SimpleTestCase):
    def search(self, results):
        with patch.object(
            info_species.requests, "get", return_value=FakeResponse({"results": results})
        ):
            return info_species.get_inaturalist_taxon("Chloris chloris")

    def test_exact_name_wins_over_more_popular_genus(self):
        self.assertEqual(self.search(INAT_RESULTS)["id"], 145360)

    def test_unrelated_results_are_discarded(self):
        self.assertIsNone(self.search(INAT_RESULTS[2:]))

    def test_no_result_returns_none(self):
        self.assertIsNone(self.search([]))

    def test_common_name_falls_back_to_english(self):
        taxon = {"english_common_name": "European Greenfinch"}
        self.assertEqual(info_species.get_common_name(taxon), "European Greenfinch")

    def test_common_name_without_taxon(self):
        self.assertEqual(info_species.get_common_name(None), "")

    def test_kingdom_hint_from_iconic_taxon(self):
        self.assertEqual(info_species.get_kingdom_hint({"iconic_taxon_name": "Aves"}), "Animalia")
        self.assertEqual(info_species.get_kingdom_hint({"iconic_taxon_name": "Reptilia"}), "Animalia")
        self.assertEqual(info_species.get_kingdom_hint({"iconic_taxon_name": "Plantae"}), "Plantae")
        self.assertIsNone(info_species.get_kingdom_hint({"iconic_taxon_name": "Inconnu"}))
        self.assertIsNone(info_species.get_kingdom_hint(None))


class InaturalistDetailsTests(SimpleTestCase):
    def details_for(self, taxon_id):
        with patch.object(
            info_species.requests,
            "get",
            return_value=FakeResponse({"results": [INAT_DETAILS[taxon_id]]}),
        ):
            return info_species.get_species_details_inaturalist({"id": taxon_id})

    def test_snake_is_a_reptile(self):
        self.assertEqual(
            self.details_for(1631566), ("Animalia", "Reptilia", "Squamata", "Colubridae")
        )

    def test_bird_lineage(self):
        self.assertEqual(
            self.details_for(145360), ("Animalia", "Aves", "Passeriformes", "Fringillidae")
        )

    def test_the_taxon_itself_completes_its_own_rank(self):
        # une recherche sur « Colubridae » ne trouve pas la famille dans ses ancêtres
        self.assertEqual(self.details_for(26141)[3], "Colubridae")

    def test_without_taxon_no_call_is_made(self):
        with patch.object(info_species.requests, "get") as get:
            self.assertEqual(info_species.get_species_details_inaturalist(None), ('', '', '', ''))
        get.assert_not_called()


class SelectGbifUsageTests(SimpleTestCase):
    def test_hint_disambiguates_homonyms(self):
        usage = info_species.select_gbif_usage(GBIF_AMBIGUOUS_MATCH, "Animalia")
        self.assertEqual(usage["family"], "Fringillidae")

    def test_hint_can_select_the_plant(self):
        usage = info_species.select_gbif_usage(GBIF_AMBIGUOUS_MATCH, "Plantae")
        self.assertEqual(usage["family"], "Poaceae")

    def test_without_hint_the_choice_is_deterministic(self):
        reversed_match = {
            **GBIF_AMBIGUOUS_MATCH,
            "alternatives": list(reversed(GBIF_AMBIGUOUS_MATCH["alternatives"])),
        }
        self.assertEqual(
            info_species.select_gbif_usage(GBIF_AMBIGUOUS_MATCH, None),
            info_species.select_gbif_usage(reversed_match, None),
        )

    def test_unknown_hint_does_not_discard_every_candidate(self):
        self.assertIsNotNone(info_species.select_gbif_usage(GBIF_AMBIGUOUS_MATCH, "Fungi"))

    def test_direct_match_is_used(self):
        usage = info_species.select_gbif_usage(GBIF_BIRD_MATCH, "Animalia")
        self.assertEqual(usage["usageKey"], 5845582)

    def test_no_match_at_all(self):
        self.assertIsNone(info_species.select_gbif_usage({"matchType": "NONE"}, "Animalia"))
        self.assertIsNone(info_species.select_gbif_usage({}, None))


class CompleteTupleTests(SimpleTestCase):
    def test_the_primary_source_is_never_overwritten(self):
        gbif = ("Animalia", "Squamata", "", "Colubridae")
        ncbi = ("Animalia", "Lepidosauria", "Squamata", "Natricidae")
        self.assertEqual(
            info_species.complete_tuple(gbif, ncbi),
            ("Animalia", "Squamata", "Squamata", "Colubridae"),
        )

    def test_the_fallback_fills_the_gaps(self):
        gbif = ("Animalia", "", "Salmoniformes", "Salmonidae")
        ncbi = ("Animalia", "Actinopterygii", "", "")
        self.assertEqual(
            info_species.complete_tuple(gbif, ncbi),
            ("Animalia", "Actinopterygii", "Salmoniformes", "Salmonidae"),
        )


class GetSpeciesDetailsTests(SimpleTestCase):
    """Cascade iNaturalist → GBIF."""

    TAXON = {"id": 1631566, "iconic_taxon_name": "Reptilia"}

    def resolve(self, latin_name, inat, gbif, taxon=TAXON):
        with (
            patch.object(info_species, "get_species_details_inaturalist", return_value=inat),
            patch.object(info_species, "get_species_details_gbif", return_value=gbif) as gbif_call,
        ):
            return info_species.get_species_details(latin_name, taxon), gbif_call

    def test_snake_class_is_reptilia(self):
        details, gbif_call = self.resolve(
            "Natrix natrix",
            ("Animalia", "Reptilia", "Squamata", "Colubridae"),
            ("Animalia", "Squamata", "", "Natricidae"),
        )
        self.assertEqual(details, ("Animalia", "Reptilia", "Squamata", "Colubridae"))
        # lignée iNaturalist complète : GBIF n'est même pas interrogé
        gbif_call.assert_not_called()

    def test_gbif_completes_a_partial_lineage(self):
        details, _ = self.resolve(
            "Salmo trutta",
            ("Animalia", "Actinopterygii", "", ""),
            ("Animalia", "", "Salmoniformes", "Salmonidae"),
        )
        self.assertEqual(details, ("Animalia", "Actinopterygii", "Salmoniformes", "Salmonidae"))

    def test_gbif_never_overwrites_inaturalist(self):
        # le backbone GBIF hisse Squamata au rang de classe : iNaturalist prime
        details, _ = self.resolve(
            "Natrix natrix",
            ("Animalia", "Reptilia", "", "Colubridae"),
            ("Animalia", "Squamata", "Squamata", "Natricidae"),
        )
        self.assertEqual(details, ("Animalia", "Reptilia", "Squamata", "Colubridae"))

    def test_gbif_is_queried_with_the_kingdom_hint(self):
        _, gbif_call = self.resolve("Natrix natrix", ('', '', '', ''), ('', '', '', ''))
        gbif_call.assert_called_once_with("Natrix natrix", "Animalia")

    def test_undetermined_species_is_queried_by_genus(self):
        _, gbif_call = self.resolve("Gehyra x", ('', '', '', ''), ('', '', '', ''))
        gbif_call.assert_called_once_with("Gehyra", "Animalia")

    def test_both_sources_failing_yields_empty_values(self):
        with (
            patch.object(
                info_species, "get_species_details_inaturalist", side_effect=OSError("boom")
            ),
            patch.object(info_species, "get_species_details_gbif", side_effect=OSError("boom")),
        ):
            self.assertEqual(info_species.get_species_details("Chloris chloris"), ('', '', '', ''))


class GetSpeciesDataTests(SimpleTestCase):
    def test_greenfinch_is_a_bird_not_a_plant(self):
        with patch.object(info_species.requests, "get", side_effect=fake_inaturalist(INAT_RESULTS)):
            data = info_species.get_species_data("Chloris chloris")

        self.assertEqual(data["kingdom"], "Animalia")
        self.assertEqual(data["class_field"], "Aves")
        self.assertEqual(data["order_field"], "Passeriformes")
        self.assertEqual(data["family"], "Fringillidae")
        self.assertEqual(data["french_name"], "Verdier d'Europe")
        self.assertEqual(data["genus"], "Chloris")
        self.assertEqual(data["species"], "chloris")

    def test_snake_is_a_reptile(self):
        taxon = {"id": 1631566, "name": "Natrix natrix", "iconic_taxon_name": "Reptilia"}
        with patch.object(info_species.requests, "get", side_effect=fake_inaturalist([taxon])):
            data = info_species.get_species_data("Natrix natrix")

        self.assertEqual(data["class_field"], "Reptilia")
        self.assertEqual(data["order_field"], "Squamata")

    def test_genus_only_name_does_not_crash(self):
        with (
            patch.object(info_species.requests, "get", side_effect=fake_inaturalist(INAT_RESULTS)),
            patch.object(info_species.py_species, "name_backbone", return_value=GBIF_BIRD_MATCH),
        ):
            data = info_species.get_species_data("Chloris")

        self.assertEqual(data["genus"], "Chloris")
        self.assertEqual(data["species"], "")
        self.assertEqual(data["french_name"], "Verdiers")

    def test_undetermined_species_keeps_its_marker(self):
        # « Genre x » : l'épithète reste « x », c'est la convention du catalogue
        with patch.object(info_species.requests, "get", side_effect=OSError("boom")):
            data = info_species.get_species_data("Gehyra x")

        self.assertEqual(data["genus"], "Gehyra")
        self.assertEqual(data["species"], "x")

    def test_inaturalist_failure_falls_back_on_gbif(self):
        with (
            patch.object(info_species.requests, "get", side_effect=OSError("boom")),
            patch.object(
                info_species.py_species, "name_backbone", return_value=GBIF_AMBIGUOUS_MATCH
            ) as name_backbone,
        ):
            data = info_species.get_species_data("Chloris chloris")

        self.assertEqual(data["french_name"], "")
        # sans indice de règne, le départage reste déterministe
        self.assertEqual(data["family"], "Fringillidae")
        name_backbone.assert_called_once_with(
            name="Chloris chloris", kingdom=None, verbose=True
        )
