import os
import unicodedata
from datetime import datetime

import requests
from pygbif import species
from PIL import Image
import yaml
from main.core.logger.logger import logger
from config.settings import MEDIA_ROOT, BASE_DIR, MEDIA_URL

PHOTO_PATH = os.path.join(MEDIA_ROOT, 'main/images/originales')
VIGNETTE_PATH = os.path.join(MEDIA_ROOT, 'main/images/vignettes')
SMALL_PATH = os.path.join(MEDIA_ROOT, 'main/images/small')
continents_yaml = os.path.join(BASE_DIR, "main/core/load_data/continents.yml")


def get_dataset_on_each_image():
    all_image_path = images_in_folder(PHOTO_PATH)

    logger.info(f"Nombre d'images {len(all_image_path)}")
    infos_all_images = []
    i = 0
    for image_path in all_image_path:
        try:
            infos_all_images.append(get_info(image_path))
        except Exception as e:
            logger.error(e)

        logger.info(f"image {i}")
        i += 1
    return infos_all_images


def get_info(image_path):
    infos = {}

    try:
        country, region, continent = get_location_from_path(image_path)
    except ValueError as e:
        logger.error(str(e))
        raise e
    infos["country"] = country
    infos["continent"] = continent
    infos["region"] = region

    try:
        genus, species, details = extraire_informations(image_path)
    except ValueError as e:
        logger.error(str(e))
        raise e

    latin_name = f"{genus} {species}"
    infos["latin_name"] = latin_name
    infos["genus"] = genus
    infos["species"] = species
    infos["details"] = details

    try:
        thumbnail = create_thumbnail(image_path)
        photo = create_small_image(image_path)
    except Exception as e:
        logger.error(str(e))
        raise e
    infos["thumbnail"] = thumbnail
    infos["photo"] = photo

    try:
        kingdom, sp_class, order, family = get_species_details(latin_name)
    except Exception as e:
        kingdom, sp_class, order, family = '', '', '', ''
        logger.error(e)
    infos["kingdom"] = kingdom
    infos["class_field"] = sp_class
    infos["order_field"] = order
    infos["family"] = family

    try:
        common_name = get_common_name(latin_name)
    except Exception as e:
        common_name = ''
        logger.error(e)
    infos["french_name"] = common_name

    try:
        date, year = get_date_taken(image_path)
    except Exception as e:
        logger.error(str(e))
        raise e

    infos["date"] = date
    infos["year"] = year

    return infos


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
    if len(value) == 2 or len(value) == 3:
        return value[0], value[1], ''
    elif len(value) > 3:
        return value[0], value[1], ' '.join(value[2:-1])
    else:
        raise ValueError(f"{title} ne correspond pas au format attendu Genre espèce (détails) identifiant")

def normaliser_chaine(chaine):
    return unicodedata.normalize('NFC', chaine)

def get_location_from_path(image_path):
    folders = image_path.replace(PHOTO_PATH + "/", '').split(os.sep)
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


def get_date_taken(image_path):
    exif = Image.open(image_path)._getexif()
    if exif and 36867 in exif:
        timestamp = exif[36867]
        date_taken = datetime.strptime(timestamp, "%Y:%m:%d %H:%M:%S")
        return date_taken.strftime("%d/%m/%Y"), date_taken.strftime("%Y")
    raise ValueError(f"Impossible de récupérer la date de l'image {image_path}")


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
    if latin_name.split(" ")[1] == "x":
        latin_name = latin_name.split(" ")[0]

    url = "https://api.inaturalist.org/v1/taxa"
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
    kingdom = ''
    sp_class = ''
    order = ''
    family= ''

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
    return kingdom, sp_class, order, family


def petite_path(image_path):
    return image_path.replace(PHOTO_PATH, SMALL_PATH)

def vignette_path(image_path):
    return image_path.replace(PHOTO_PATH, VIGNETTE_PATH)


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

def create_small_image(image_path):
    output_path = petite_path(image_path)
    resize_image(image_path, output_path, 1000)
    return output_path.replace(str(MEDIA_ROOT) + "/", str(MEDIA_URL))


def create_thumbnail(image_path):
    output_path = vignette_path(image_path)
    resize_image(image_path, output_path, 300)
    return output_path.replace(str(MEDIA_ROOT) + "/", str(MEDIA_URL))
