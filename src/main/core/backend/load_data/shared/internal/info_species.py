import requests
from pygbif import species as py_species

from main.core.backend.logger.logger import logger

INATURALIST_API_URL = "https://api.inaturalist.org/v1/taxa"
INATURALIST_TAXON_URL = "https://api.inaturalist.org/v1/taxa/{taxon_id}"
REQUEST_TIMEOUT = 10

# les quatre rangs stockés en base, du plus général au plus fin
TAXONOMIC_RANKS = ("kingdom", "class", "order", "family")

# iNaturalist expose un « iconic taxon » (Aves, Insecta, Plantae…) et non un règne :
# on le ramène au règne GBIF correspondant. Ce règne sert d'indice pour lever les
# homonymies inter-règnes, ex. Chloris chloris = le verdier d'Europe (Fringillidae)
# *et* une graminée (Poaceae) : GBIF ne peut pas trancher seul.
ICONIC_TAXON_TO_KINGDOM = {
    "Actinopterygii": "Animalia",
    "Amphibia": "Animalia",
    "Animalia": "Animalia",
    "Arachnida": "Animalia",
    "Aves": "Animalia",
    "Insecta": "Animalia",
    "Mammalia": "Animalia",
    "Mollusca": "Animalia",
    "Reptilia": "Animalia",
    "Bacteria": "Bacteria",
    "Chromista": "Chromista",
    "Fungi": "Fungi",
    "Plantae": "Plantae",
    "Protozoa": "Protozoa",
}


def get_species_data(latin_name: str) -> dict:
    infos_specie = {}

    parts = latin_name.split(" ")

    infos_specie["latin_name"] = latin_name
    infos_specie["genus"] = parts[0]
    infos_specie["species"] = parts[1] if len(parts) > 1 else ""

    try:
        taxon = get_inaturalist_taxon(latin_name)
    except Exception as e:
        taxon = None
        logger.error(e)

    kingdom, sp_class, order, family = get_species_details(latin_name, taxon)

    infos_specie["kingdom"] = kingdom
    infos_specie["class_field"] = sp_class
    infos_specie["order_field"] = order
    infos_specie["family"] = family
    infos_specie["french_name"] = get_common_name(taxon)

    return infos_specie


def normalize_query_name(latin_name: str) -> str:
    """« Genre x » désigne une espèce indéterminée : on interroge le genre seul."""
    parts = latin_name.split(" ")
    if len(parts) > 1 and parts[1].lower() == "x":
        return parts[0]
    return latin_name


def get_inaturalist_taxon(latin_name: str) -> dict | None:
    """Taxon iNaturalist correspondant exactement au nom latin recherché.

    L'API trie par popularité et non par pertinence : pour « Chloris chloris » le
    genre « Chloris » (Verdiers) sort avant l'espèce, et des taxons sans rapport
    peuvent suivre. On ne retient donc qu'une correspondance exacte, sur le nom
    accepté ou sur le terme ayant déclenché le résultat (cas des synonymes).
    """
    query = normalize_query_name(latin_name)

    response = requests.get(
        INATURALIST_API_URL,
        params={"q": query, "locale": "fr"},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()

    for taxon in response.json().get("results", []):
        names = {taxon.get("name", ""), taxon.get("matched_term", "")}
        if query.lower() in {name.lower() for name in names if name}:
            return taxon

    logger.warning(f"aucun taxon iNaturalist pour {latin_name}")
    return None


def get_common_name(taxon: dict | None) -> str:
    if not taxon:
        return ""
    return taxon.get("preferred_common_name") or taxon.get("english_common_name") or ""


def get_kingdom_hint(taxon: dict | None) -> str | None:
    if not taxon:
        return None
    return ICONIC_TAXON_TO_KINGDOM.get(taxon.get("iconic_taxon_name"))


def get_species_details_inaturalist(taxon: dict | None) -> tuple:
    """Classification iNaturalist.

    C'est la source qui garde les classes de l'usage naturaliste : `Reptilia`,
    que le backbone GBIF éclate en Squamata / Testudines sans ordre associé.
    La recherche ne renvoie pas la lignée, d'où cet appel sur le taxon.
    """
    if not taxon:
        return '', '', '', ''

    response = requests.get(
        INATURALIST_TAXON_URL.format(taxon_id=taxon["id"]),
        params={"locale": "fr"},
        timeout=REQUEST_TIMEOUT,
    )
    response.raise_for_status()

    results = response.json().get("results") or [{}]
    # le taxon lui-même compte : une recherche par genre ou par famille s'arrête là
    lineage = [*(results[0].get("ancestors") or []), results[0]]
    taxonomy = {step.get("rank"): step.get("name", '') for step in lineage}

    return tuple(taxonomy.get(rank, '') for rank in TAXONOMIC_RANKS)


def select_gbif_usage(match: dict, kingdom_hint: str | None) -> dict | None:
    """Choisit le taxon GBIF pertinent parmi les correspondances retournées.

    Quand plusieurs taxons portent le même nom, `species/match` répond
    matchType=NONE (« Multiple equal matches ») et place les candidats dans
    `alternatives`. On départage avec le règne connu par ailleurs, sinon on
    prend la meilleure confiance — à confiance égale le plus petit usageKey,
    pour rester déterministe d'un appel à l'autre.
    """
    if not match:
        return None

    candidates = [
        candidate
        for candidate in [match, *(match.get("alternatives") or [])]
        if candidate.get("matchType") not in (None, "NONE")
    ]

    if kingdom_hint:
        expected_kingdom = [c for c in candidates if c.get("kingdom") == kingdom_hint]
        if expected_kingdom:
            candidates = expected_kingdom

    if not candidates:
        return None

    if len(candidates) > 1:
        # un candidat sans règne vaut « ? » : trier des None avec des str lèverait
        kingdoms = sorted({c.get("kingdom") or "?" for c in candidates})
        name = match.get("canonicalName") or candidates[0].get("canonicalName")
        logger.warning(f"plusieurs taxons GBIF pour {name} : {kingdoms}")

    return max(candidates, key=lambda c: (c.get("confidence") or 0, -(c.get("usageKey") or 0)))


def get_species_details_gbif(latin_name: str, kingdom_hint: str | None = None) -> tuple:
    logger.info(f"data for species {latin_name}")

    match = py_species.name_backbone(name=latin_name, kingdom=kingdom_hint, verbose=True)
    usage = select_gbif_usage(match, kingdom_hint)
    if usage is None:
        return '', '', '', ''

    return tuple(usage.get(rank) or '' for rank in TAXONOMIC_RANKS)


def get_species_details(latin_name: str, taxon: dict | None = None) -> tuple:
    """Classification consolidée : iNaturalist d'abord, GBIF pour les trous.

    Une troisième source NCBI (ete3) a été retirée après audit des 2527 espèces
    du catalogue : elle n'a jamais comblé un rang que ces deux-là laissaient
    vide, et sa nomenclature dégradait le résultat — `Sarcopterygii` pour tous
    les tétrapodes, `Metazoa` au lieu d'`Animalia`.
    """
    result = ('', '', '', '')
    try:
        result = get_species_details_inaturalist(taxon)
    except Exception as e:
        logger.error(e)

    if '' not in result:
        return result

    gbif = ('', '', '', '')
    try:
        gbif = get_species_details_gbif(normalize_query_name(latin_name), get_kingdom_hint(taxon))
    except Exception as e:
        logger.error(e)

    return complete_tuple(result, gbif)


def complete_tuple(primary, fallback):
    """La source la plus fiable prime : la suivante ne comble que les trous."""
    return tuple(
        a if a else b
        for a, b in zip(primary, fallback)
    )
