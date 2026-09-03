import requests
from ete3 import NCBITaxa
from pygbif import species as py_species

from main.core.backend.logger.logger import logger

## Initialisation lib ete3, décommenter ces lignes
## import ssl
## ssl._create_default_https_context = ssl._create_unverified_context
## ncbi = NCBITaxa()
## ncbi.update_taxonomy_database()

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

# NCBI n'emploie pas la même nomenclature de règne que GBIF
KINGDOM_ALIASES = {
    "Metazoa": "Animalia",
    "Viridiplantae": "Plantae",
}

# NCBI place `superclass = Sarcopterygii` au-dessus de *tous* les tétrapodes : reptiles,
# oiseaux, mammifères… Elle ne vaut comme classe que pour les poissons à nageoires
# charnues (cœlacanthes, dipneustes), les seuls à n'avoir aucun rang `class`.
TETRAPOD_SUPERCLASS = "Sarcopterygii"

_ncbi = None


def get_ncbi() -> NCBITaxa:
    """Instanciation paresseuse : NCBITaxa() charge une base locale de plusieurs Mo."""
    global _ncbi
    if _ncbi is None:
        _ncbi = NCBITaxa()
    return _ncbi


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
    """Les hybrides (« Genre x espece ») ne sont référencés que sous leur genre."""
    parts = latin_name.split(" ")
    if len(parts) > 1 and parts[1] == "x":
        return parts[0]
    return latin_name


def normalize_kingdom(kingdom: str) -> str:
    return KINGDOM_ALIASES.get(kingdom, kingdom)


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

    C'est la seule des trois sources à garder les classes de l'usage naturaliste :
    `Reptilia`, que le backbone GBIF éclate en Squamata / Testudines (sans ordre)
    et que NCBI remplace par Lepidosauria sous une superclasse Sarcopterygii.
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
        logger.warning(
            "plusieurs taxons GBIF pour "
            f"{match.get('canonicalName') or candidates[0].get('canonicalName')} : "
            f"{sorted({c.get('kingdom') for c in candidates})}"
        )

    return max(candidates, key=lambda c: (c.get("confidence") or 0, -(c.get("usageKey") or 0)))


def get_species_details_gbif(latin_name: str, kingdom_hint: str | None = None) -> tuple:
    logger.info(f"data for species {latin_name}")

    match = py_species.name_backbone(name=latin_name, kingdom=kingdom_hint, verbose=True)
    usage = select_gbif_usage(match, kingdom_hint)
    if usage is None:
        return '', '', '', ''

    return (
        usage.get("kingdom") or '',
        usage.get("class") or '',
        usage.get("order") or '',
        usage.get("family") or '',
    )


def pick_ncbi_class(taxonomy: dict) -> str:
    """Classe NCBI la plus parlante.

    NCBI descend parfois d'un cran sous la classe d'usage (`Actinopteri` sous la
    superclasse `Actinopterygii`), d'où la préférence pour la superclasse — sauf
    Sarcopterygii, qui ferait d'un lézard ou d'un oiseau un poisson osseux.
    """
    superclass = taxonomy.get("superclass", "")
    if superclass and superclass != TETRAPOD_SUPERCLASS:
        return superclass
    return taxonomy.get("class", "") or superclass


def build_ncbi_taxonomy(taxid: int) -> dict:
    ncbi = get_ncbi()
    lineage = ncbi.get_lineage(taxid)
    names = ncbi.get_taxid_translator(lineage)
    ranks = ncbi.get_rank(lineage)

    taxonomy = {ranks[taxid]: names[taxid] for taxid in lineage}
    if "kingdom" in taxonomy:
        taxonomy["kingdom"] = normalize_kingdom(taxonomy["kingdom"])
    return taxonomy


def get_species_details_ncbi(latin_name: str, kingdom_hint: str | None = None) -> tuple:
    ncbi = get_ncbi()
    taxids = ncbi.get_name_translator([latin_name]).get(latin_name, [])
    taxonomies = [build_ncbi_taxonomy(taxid) for taxid in taxids]

    if kingdom_hint:
        # NCBI connaît lui aussi les homonymes : on garde le bon règne
        taxonomies = [t for t in taxonomies if t.get("kingdom") == kingdom_hint] or taxonomies

    if not taxonomies:
        return '', '', '', ''

    taxonomy = taxonomies[0]
    return (
        taxonomy.get("kingdom", ''),
        pick_ncbi_class(taxonomy),
        taxonomy.get("order", ''),
        taxonomy.get("family", ''),
    )


def get_species_details(latin_name: str, taxon: dict | None = None) -> tuple:
    """Classification consolidée, par ordre de fiabilité décroissante.

    iNaturalist d'abord (taxonomie naturaliste usuelle), complété par le backbone
    GBIF, puis par NCBI. Chaque source ne remplit que ce que la précédente ignore,
    et on s'arrête dès que les quatre rangs sont connus.
    """
    query = normalize_query_name(latin_name)
    kingdom_hint = get_kingdom_hint(taxon)

    result = ('', '', '', '')
    try:
        result = get_species_details_inaturalist(taxon)
    except Exception as e:
        logger.error(e)

    if '' not in result:
        return (normalize_kingdom(result[0]), *result[1:])

    gbif = ('', '', '', '')
    try:
        gbif = get_species_details_gbif(query, kingdom_hint)
    except Exception as e:
        logger.error(e)

    result = complete_tuple(result, gbif)
    if '' not in result:
        return (normalize_kingdom(result[0]), *result[1:])

    # des valeurs manquent encore
    ncbi = ('', '', '', '')
    try:
        ncbi = get_species_details_ncbi(query, kingdom_hint)
    except Exception as e:
        logger.error(e)

    kingdom, sp_class, order, family = complete_tuple(result, ncbi)

    if sp_class and sp_class == order and ncbi[1] not in ('', sp_class, TETRAPOD_SUPERCLASS):
        # le backbone GBIF hisse certains ordres au rang de classe (Squamata,
        # Testudines…) : on remonte d'un cran plutôt que de répéter le même taxon
        sp_class = ncbi[1]

    return (normalize_kingdom(kingdom), sp_class, order, family)


def complete_tuple(primary, fallback):
    """La source la plus fiable prime : la suivante ne comble que les trous."""
    return tuple(
        a if a else b
        for a, b in zip(primary, fallback)
    )
