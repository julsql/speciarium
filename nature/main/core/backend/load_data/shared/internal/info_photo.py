import hashlib
import os
import unicodedata
from datetime import datetime
from typing import Any

import yaml
from PIL import Image

from config.settings import MEDIA_ROOT, BASE_DIR, MEDIA_URL
from main.core.backend.logger.logger import logger

continents_yaml = os.path.join(BASE_DIR, "main/core/backend/load_data/shared/continents.yml")


def VIGNETTE_PATH(collection_id):
    return f'main/images/{collection_id}/vignettes'


def VIGNETTE_ROOT(collection_id):
    return os.path.join(MEDIA_ROOT, VIGNETTE_PATH(collection_id))


def SMALL_PATH(collection_id):
    return f'main/images/{collection_id}/small'


def SMALL_ROOT(collection_id):
    return os.path.join(MEDIA_ROOT, SMALL_PATH(collection_id))


PHOTO_PATH = 'originales'
PHOTO_ROOT = os.path.join(BASE_DIR, PHOTO_PATH)


def get_info(image_path, rm_path, collection_id, timestamp=None, latitude=None, longitude=None, image_hash=None, ) -> dict[
    str, str | None | Any]:
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
        thumbnail = get_thumbnail_path(image_path, rm_path, collection_id)
        photo = get_small_image_path(image_path, rm_path, collection_id)
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
        date, year = None, None

    if date == "":
        date = None

    infos_photo["date"] = date
    infos_photo["year"] = year

    try:
        latitude, longitude = get_place_taken(image_path, latitude, longitude)
    except Exception as e:
        logger.error(str(e))
        latitude, longitude = None, None

    infos_photo["latitude"] = latitude
    infos_photo["longitude"] = longitude

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
    if len(value) < 2:
        raise ValueError(f"{title} ne correspond pas au format attendu Genre espèce (détails) identifiant")
    latin = f"{value[0]} {value[1]}"
    if len(value) == 2 or len(value) == 3:
        return latin, ''
    elif len(value) > 3:
        return latin, ' '.join(value[2:-1])
    return None

def get_hash(image_path, image_hash):
    if image_hash:
        return image_hash
    with open(image_path, 'rb') as image_file:
        sha256 = hashlib.sha256()
        for chunk in iter(lambda: image_file.read(4096), b""):
            sha256.update(chunk)
        image_hash = sha256.hexdigest()
        return image_hash


def get_thumbnail_path(image_path, rm_path, collection_id):
    output_path = vignette_path(image_path, rm_path, collection_id)
    return replace_root(output_path, str(MEDIA_ROOT) + "/", MEDIA_URL)


def get_small_image_path(image_path, rm_path, collection_id):
    output_path = petite_path(image_path, rm_path, collection_id)
    return replace_root(output_path, str(MEDIA_ROOT) + "/", MEDIA_URL)


def petite_path(image_path, rm_path, collection_id):
    return replace_root(image_path, rm_path, SMALL_ROOT(collection_id))


def vignette_path(image_path, rm_path, collection_id):
    return replace_root(image_path, rm_path, VIGNETTE_ROOT(collection_id))


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


def get_place_taken(image_path, latitude, longitude):
    error_no_coordinates = "Aucune coordonnée trouvée"
    if (latitude, longitude) == (None, None):
        img = Image.open(image_path)

        exif_data = img._getexif()
        if exif_data is None:
            raise ValueError(error_no_coordinates)

        gps_info = exif_data.get(34853)
        if gps_info is None:
            raise ValueError(error_no_coordinates)

        lat = gps_info.get(2)
        lon = gps_info.get(4)

        if lat and lon:
            latitude = convert_to_decimal(lat, gps_info.get(1))
            longitude = convert_to_decimal(lon, gps_info.get(3))

            return latitude, longitude
        else:
            raise ValueError(error_no_coordinates)
    if (latitude, longitude) == ("", ""):
        raise ValueError("Coordonnées de l'image vide (non transmis)")

    return latitude, longitude


def convert_to_decimal(coord, ref):
    degrees = float(coord[0])
    minutes = float(coord[1])
    seconds = float(coord[2])

    decimal_coord = degrees + (minutes / 60.0) + (seconds / 3600.0)

    # Appliquer le signe basé sur la référence (N/S/E/W)
    if ref in ['S', 'W']:
        decimal_coord = -decimal_coord

    return decimal_coord


def images_in_folder(folder_path, all_image_path=None):
    if all_image_path is None:
        all_image_path = []
    if os.path.isdir(folder_path):
        for item in os.listdir(folder_path):
            item_path = os.path.join(folder_path, item)

            if os.path.isdir(item_path):
                images_in_folder(item_path, all_image_path)
            else:
                if is_image(item_path):
                    all_image_path.append(normaliser_unicode(item_path))

    return all_image_path


def is_image(image_path):
    extension_photo = ('.png', '.jpg', '.jpeg', '.tiff', '.bmp', '.gif')
    return image_path.lower().endswith(extension_photo)


def delete_file_with_permission_check(file_path):
    try:
        if os.path.exists(file_path):
            if os.access(file_path, os.W_OK):
                os.remove(file_path)
                logger.info(f"Le fichier {file_path} a été supprimé avec succès.")
            else:
                logger.warning(f"Permissions insuffisantes pour supprimer le fichier {file_path}.")
        else:
            logger.warning(f"Le fichier {file_path} n'existe pas.")
    except Exception as e:
        logger.error(f"Erreur : {e}")
