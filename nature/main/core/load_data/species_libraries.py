import requests
from pygbif import species

def get_common_name(latin_name):
    url = "https://api.inaturalist.org/v1/taxa"
    if latin_name.split(" ")[1] == "x":
        latin_name = latin_name.split(" ")[0]

    params = {"q": latin_name, "locale": "fr"}

    response = requests.get(url, params=params)
    if response.status_code == 200:
        data = response.json()

        if data['results']:
            taxon = data['results'][0]
            common_name = taxon.get('preferred_common_name', '')

            return common_name

    raise ValueError("Error getting common_name")

def get_species_details(latin_name):
    if latin_name.split(" ")[1] == "x":
        latin_name = latin_name.split(" ")[0]

    sp = species.name_suggest(q=latin_name)
    sp_class = ''
    order = ''
    family= ''
    kingdom = ''
    if len(sp) == 0:
        raise ValueError(f"Pas d'info pour {latin_name}")
    if 'kingdomKey' in sp[0]:
        kingdom = sp[0]['higherClassificationMap'][str(sp[0]['kingdomKey'])]
    if 'classKey' in sp[0]:
        sp_class = sp[0]['higherClassificationMap'][str(sp[0]['classKey'])]
    if 'orderKey' in sp[0]:
        order = sp[0]['higherClassificationMap'][str(sp[0]['orderKey'])]
    if 'familyKey' in sp[0]:
        family = sp[0]['higherClassificationMap'][str(sp[0]['familyKey'])]
    return sp_class, order, family, kingdom

latin_name = "Alces alces"

"""
import sqlite3


conn = sqlite3.connect('/Users/juliettedebono/Documents/Un peu de tout/Programmation/Django/nature/nature/database/nature.sqlite3')  # Remplacez 'example.db' par le nom de votre fichier DB

cursor = conn.cursor()

cursor.execute("SELECT latin_name, species FROM main_species")
rows = cursor.fetchall()

nb_errors = 0
nb_pas_errors = 0
for row in rows:
    if row[0].split(" ")[1] != 'x':
        try:
            name = get_species_details(row[0])
            if name == '':
                print(row[1].replace("/media/main/images/small/", ""))
                nb_errors += 1
            else:
                nb_pas_errors += 1
        except Exception as e:
            print(row[1].replace("/media/main/images/small/", ""))
            nb_errors += 1
            continue
print("nb errors " + str(nb_errors))
print("nb pas errors " + str(nb_pas_errors))

conn.close()
"""