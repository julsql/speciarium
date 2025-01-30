import hashlib
import os
import unicodedata
from datetime import datetime
from typing import Any

import requests
from pygbif import species
from ete3 import NCBITaxa
from PIL import Image
import yaml

from main.core.logger.logger import logger
from config.settings import MEDIA_ROOT, BASE_DIR, MEDIA_URL
from main.models.species import Species

## Initialisation lib ete3, décommenter ces lignes
## import ssl
## ssl._create_default_https_context = ssl._create_unverified_context
## ncbi = NCBITaxa()
## ncbi.update_taxonomy_database()

PHOTO_PATH = os.path.join(BASE_DIR, 'originales')
VIGNETTE_PATH = os.path.join(MEDIA_ROOT, 'main/images/vignettes')
SMALL_PATH = os.path.join(MEDIA_ROOT, 'main/images/small')
continents_yaml = os.path.join(BASE_DIR, "main/core/load_data/continents.yml")


def get_dataset_on_each_image() -> list[dict[str, str]]:
    all_image_path = images_in_folder(PHOTO_PATH)
    return get_dataset_from_images_path(all_image_path, PHOTO_PATH)


def get_dataset_from_images_path(images_path, path_to_remove) -> list[dict[str, str]]:
    logger.info(f"Nombre d'images {len(images_path)}")
    info_photo = []
    i = 0
    for image_path in images_path:
        try:
            photo = get_info(image_path, path_to_remove)
            info_photo.append(photo)
        except Exception as e:
            logger.error(e)

        logger.info(f"image {i}")
        i += 1
    return info_photo


def get_all_species_data(latin_name_list: list[str]) -> list[dict[str, str]]:
    species_already_added = Species.objects.values_list('latin_name')
    info_species = []
    i = 0
    for latin_name in latin_name_list:
        if latin_name not in species_already_added:
            try:
                specie = get_species_data(latin_name)
                info_species.append(specie)
                species_already_added.append(specie['latin_name'])
            except Exception as e:
                logger.error(e)

        logger.info(f"image {i}")
        i += 1
    return info_species


def get_species_data(latin_name: str) -> dict:
    infos_specie = {}

    [genus, species_name] = latin_name.split(" ")

    infos_specie["latin_name"] = latin_name
    infos_specie["genus"] = genus
    infos_specie["species"] = species_name

    try:
        kingdom, sp_class, order, family = get_species_details(latin_name)
    except Exception as e:
        kingdom, sp_class, order, family = '', '', '', ''
        logger.error(e)

    infos_specie["kingdom"] = kingdom
    infos_specie["class_field"] = sp_class
    infos_specie["order_field"] = order
    infos_specie["family"] = family

    try:
        common_name = get_common_name(latin_name)
    except Exception as e:
        common_name = ''
        logger.error(e)

    infos_specie["french_name"] = common_name
    return infos_specie

def get_info(image_path, rm_path, timestamp = None) -> dict[str, str | None | Any]:
    infos_photo = {}

    try:
        country, region, continent = get_location_from_path(image_path, rm_path)
    except ValueError as e:
        logger.error(str(e))
        raise e
    infos_photo["country"] = country
    infos_photo["continent"] = continent
    infos_photo["region"] = region

    try:
        latin, details = extraire_informations(image_path)
    except ValueError as e:
        logger.error(str(e))
        raise e

    infos_photo["latin_name"] = latin
    infos_photo["details"] = details

    try:
        image_hash = get_hash(image_path)
        thumbnail = create_thumbnail(image_path, rm_path)
        photo = create_small_image(image_path, rm_path)
    except Exception as e:
        logger.error(str(e))
        raise e
    infos_photo["hash"] = image_hash
    infos_photo["thumbnail"] = thumbnail
    infos_photo["photo"] = photo

    try:
        date, year = get_date_taken(image_path, timestamp)
    except Exception as e:
        logger.error(str(e))
        date, year = '', None

    infos_photo["date"] = date
    infos_photo["year"] = year

    return infos_photo


def is_image(image_path):
    extension_photo = ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')
    return image_path.lower().endswith(extension_photo)


def images_in_folder(folder_path, all_image_path=None):
    if all_image_path is None:
        all_image_path = []
    for item in os.listdir(folder_path):
        item_path = os.path.join(folder_path, item)

        if os.path.isdir(item_path):
            images_in_folder(item_path, all_image_path)
        else:
            if is_image(item_path):
                all_image_path.append(item_path)

    return all_image_path


def extraire_informations(path):
    title = os.path.basename(path).split('.')[0]
    title = title.replace('  ', ' ')
    value = title.split(' ')
    latin = f"{value[0]} {value[1]}"
    if len(value) == 2 or len(value) == 3:
        return latin, ''
    elif len(value) > 3:
        return latin, ' '.join(value[2:-1])
    else:
        raise ValueError(f"{title} ne correspond pas au format attendu Genre espèce (détails) identifiant")

def normaliser_chaine(chaine):
    return unicodedata.normalize('NFC', chaine)

def get_location_from_path(image_path, rm_path):
    folders = image_path.replace(rm_path + "/", '').split(os.sep)
    logger.error(folders)
    if len(folders) > 2:  # Exemple : pays/région/photo.jpeg
        pays = normaliser_chaine(folders[0])
        region = normaliser_chaine(folders[1])
    elif len(folders) == 2:  # Exemple : pays/photo.jpeg
        pays = normaliser_chaine(folders[0])
        region = ''
    else:
        raise ValueError("Chemin invalide. Vérifiez la structure du chemin.")
    return pays, region, trouver_continent(pays)


def get_date_taken(image_path, timestamp):
    if timestamp is None:
        exif = Image.open(image_path)._getexif()
        if exif and 36867 in exif:
            timestamp = exif[36867]
        else:
            raise ValueError(f"Impossible de récupérer la date de l'image {image_path}")

    date_taken = datetime.strptime(timestamp, "%Y:%m:%d %H:%M:%S")
    return date_taken.strftime("%Y-%m-%d"), date_taken.strftime("%Y")


def charger_fichier_yaml(fichier_yaml):
    with open(fichier_yaml, 'r', encoding='utf-8') as fichier:
        contenu = yaml.load(fichier, Loader=yaml.FullLoader)
    return contenu


def trouver_continent(pays):
    contenu_fichier = charger_fichier_yaml(continents_yaml)
    for continent, pays_par_continent in contenu_fichier.items():
        if pays.lower() in (pays_nom.lower() for pays_nom in pays_par_continent):
            return continent
    return ''

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

    return sp_class, order, family, kingdom

def get_species_details_2(latin_name):
    sp = species.name_suggest(q=latin_name)
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
    return sp_class, order, family, kingdom

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

    return result

def petite_path(image_path, rm_path):
    return image_path.replace(rm_path, SMALL_PATH)

def vignette_path(image_path, rm_path):
    return image_path.replace(rm_path, VIGNETTE_PATH)


def create_directories(path):
    if not os.path.exists(path):
        os.makedirs(path)

def resize_image(input_path, output_path, size):
    create_directories(os.path.dirname(output_path))
    with Image.open(input_path) as img:
        width_percent = (size / float(img.size[0]))
        height_size = int((float(img.size[1]) * float(width_percent)))
        new_img = img.resize((size, height_size))
        new_img.save(output_path)

def create_small_image(image_path, rm_path):
    output_path = petite_path(image_path, rm_path)
    resize_image(image_path, output_path, 1000)
    return output_path.replace(str(MEDIA_ROOT) + "/", str(MEDIA_URL))


def create_thumbnail(image_path, rm_path):
    output_path = vignette_path(image_path, rm_path)
    resize_image(image_path, output_path, 300)
    return output_path.replace(str(MEDIA_ROOT) + "/", str(MEDIA_URL))

def get_hash(image_path):
    with open(image_path, 'rb') as image_file:
        sha256 = hashlib.sha256()
        for chunk in iter(lambda: image_file.read(4096), b""):
            sha256.update(chunk)
        image_hash = sha256.hexdigest()
        return image_hash
