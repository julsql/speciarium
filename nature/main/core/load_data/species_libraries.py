import requests
from pygbif import species as py_species
from ete3 import NCBITaxa

## Initialisation ete3, décommenter ces lignes
## import ssl
## ssl._create_default_https_context = ssl._create_unverified_context
## from ete3 import NCBITaxa
## ncbi = NCBITaxa()
## ncbi.update_taxonomy_database()

def get_common_name(latin_name):
    url = "https://api.inaturalist.org/v1/taxa"
    if latin_name.split(" ")[1] == "x":
        latin_name = latin_name.split(" ")[0]

    params = {"q": latin_name, "locale": "fr"}

    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()
        common_name = ''

        if data['results']:
            for taxon in data['results']:
                if "preferred_common_name" in taxon:
                    common_name = taxon.get('preferred_common_name')
                    break
            if common_name == '':
                for taxon in data['results']:
                    if "english_common_name" in taxon:
                        common_name = taxon.get('english_common_name')
                        break
            return common_name

    raise ValueError("Error getting common_name")

def get_species_details_1(latin_name):
    sp = py_species.name_suggest(q=latin_name)
    kingdom = ''
    sp_class = ''
    order = ''
    family= ''

    if len(sp) > 0:
        if 'kingdomKey' in sp[0]:
            kingdom = sp[0]['higherClassificationMap'][str(sp[0]['kingdomKey'])]
        if 'classKey' in sp[0]:
            sp_class = sp[0]['higherClassificationMap'][str(sp[0]['classKey'])]
        if 'orderKey' in sp[0]:
            order = sp[0]['higherClassificationMap'][str(sp[0]['orderKey'])]
        if 'familyKey' in sp[0]:
            family = sp[0]['higherClassificationMap'][str(sp[0]['familyKey'])]
    return kingdom, sp_class, order, family


def get_species_details_2(latin_name):
    sp_class = ''
    order = ''
    family= ''
    kingdom = ''

    ncbi = NCBITaxa()
    tax = ncbi.get_name_translator([latin_name])
    if latin_name in tax and len(tax[latin_name]) > 0:
        taxid = tax[latin_name][0]
        lineage = ncbi.get_lineage(taxid)
        names = ncbi.get_taxid_translator(lineage)
        ranks = ncbi.get_rank(lineage)
        taxonomy = {ranks[taxid]: names[taxid] for taxid in lineage}

        if "superclass" in taxonomy:
            sp_class = taxonomy['superclass']
        elif "class" in taxonomy:
            sp_class = taxonomy['class']
        if "family" in taxonomy:
            family = taxonomy['family']
        if "kingdom" in taxonomy:
            kingdom = taxonomy['kingdom']
        if "order" in taxonomy:
            order = taxonomy['order']

    return kingdom, sp_class, order, family

def merge_tuple(tuple1, tuple2):
    return tuple(
        b if b else a
        for a, b in zip(tuple1, tuple2)
    )

def get_species_details(latin_name):
    if " " in latin_name and latin_name.split(" ")[1] == "x":
        latin_name = latin_name.split(" ")[0]
    result = get_species_details_1(latin_name)
    if '' in result:
        # des valeurs manquent
        result2 = get_species_details_2(latin_name)
        result = merge_tuple(result, result2)
    if result[0] == "Metazoa":
        result = ("Animalia", *result[1:])

    return result


## Ancienne méthode : error=188 pas_error=242
## Nouvelle méthode : error=54 pas_error=376
## Les deux : error=8 pas_error=422


def try_all_value():
    import sqlite3

    conn = sqlite3.connect('/Users/juliettedebono/Documents/Un peu de tout/Programmation/Django/nature/nature/database/nature.sqlite3')  # Remplacez 'example.db' par le nom de votre fichier DB

    cursor = conn.cursor()

    cursor.execute("SELECT latin_name FROM main_species")
    rows = cursor.fetchall()

    nb_errors = 0
    nb_pas_errors = 0
    for row in rows:
        try:
            infos = get_species_details(row[0])
            if '' in infos:
                print(row[0])
                nb_errors += 1
            else:
                nb_pas_errors += 1
        except Exception:
            print(row[0])
            nb_errors += 1
            continue
    print("nb errors " + str(nb_errors))
    print("nb pas errors " + str(nb_pas_errors))

    conn.close()

try_all_value()
