import hashlib
import os
from datetime import datetime
from typing import Any

import unicodedata
import yaml
from PIL import Image

from config.settings import MEDIA_ROOT, BASE_DIR, MEDIA_URL
from main.core.backend.logger.logger import logger

continents_yaml = os.path.join(BASE_DIR, "main/core/backend/load_data/shared/continents.yml")
VIGNETTE_PATH = os.path.join(MEDIA_ROOT, 'main/images/vignettes')
SMALL_PATH = os.path.join(MEDIA_ROOT, 'main/images/small')
PHOTO_PATH = os.path.join(BASE_DIR, 'originales')


def get_info(image_path, rm_path, timestamp=None, image_hash=None) -> dict[str, str | None | Any]:
    image_path = normaliser_unicode(image_path)
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
        image_hash = get_hash(image_path, image_hash)
        thumbnail = get_thumbnail_path(image_path, rm_path)
        photo = get_small_image_path(image_path, rm_path)
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

    for key, value in infos_photo.items():
        if type(value) is str:
            infos_photo[key] = normaliser_unicode(value)

    return infos_photo


def normaliser_unicode(texte):
    return unicodedata.normalize('NFC', texte)


def replace_root(image_path, rm_root, replace_root_path):
    if rm_root and rm_root != "" and rm_root in image_path:
        image_path = image_path.replace(rm_root, "")
    return os.path.join(replace_root_path, image_path)


def get_location_from_path(image_path, rm_path):
    folders = replace_root(image_path, rm_path, '').split(os.sep)
    logger.info(folders)
    if len(folders) > 2:  # Exemple : pays/région/photo.jpeg
        pays = normaliser_unicode(folders[0])
        region = normaliser_unicode(folders[1])
    elif len(folders) == 2:  # Exemple : pays/photo.jpeg
        pays = normaliser_unicode(folders[0])
        region = ''
    else:
        raise ValueError("Chemin invalide. Vérifiez la structure du chemin.")
    return pays, region, find_continent(pays)


def find_continent(pays):
    contenu_fichier = load_yaml(continents_yaml)
    for continent, pays_par_continent in contenu_fichier.items():
        if pays.lower() in (pays_nom.lower() for pays_nom in pays_par_continent):
            return continent
    return ''


def load_yaml(fichier_yaml):
    with open(fichier_yaml, 'r', encoding='utf-8') as fichier:
        contenu = yaml.load(fichier, Loader=yaml.FullLoader)
    return contenu


def get_latin_name(image_path):
    return " ".join(os.path.splitext(os.path.basename(image_path))[0].split(" ")[:2])


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


def get_hash(image_path, image_hash):
    if image_hash:
        return image_hash
    with open(image_path, 'rb') as image_file:
        sha256 = hashlib.sha256()
        for chunk in iter(lambda: image_file.read(4096), b""):
            sha256.update(chunk)
        image_hash = sha256.hexdigest()
        return image_hash


def get_thumbnail_path(image_path, rm_path):
    output_path = vignette_path(image_path, rm_path)
    return replace_root(output_path, str(MEDIA_ROOT) + "/", MEDIA_URL)


def get_small_image_path(image_path, rm_path):
    output_path = petite_path(image_path, rm_path)
    return replace_root(output_path, str(MEDIA_ROOT) + "/", MEDIA_URL)


def petite_path(image_path, rm_path):
    return replace_root(image_path, rm_path, SMALL_PATH)


def vignette_path(image_path, rm_path):
    return replace_root(image_path, rm_path, VIGNETTE_PATH)


def get_date_taken(image_path, timestamp):
    if timestamp is None:
        exif = Image.open(image_path)._getexif()
        if exif and 36867 in exif:
            timestamp = exif[36867]
        else:
            raise ValueError(f"Impossible de récupérer la date de l'image {image_path}")
    if timestamp == "":
        raise ValueError("Date de l'image vide (non transmis)")

    date_taken = datetime.strptime(timestamp, "%Y:%m:%d %H:%M:%S")
    return date_taken.strftime("%Y-%m-%d"), date_taken.strftime("%Y")
