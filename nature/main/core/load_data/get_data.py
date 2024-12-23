import os
from datetime import datetime

import httpcore
from PIL import Image
import taxoniq
from deep_translator import GoogleTranslator
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
        pays, region, continent = get_location_from_path(image_path)
    except ValueError as e:
        logger.error(str(e))
        raise e
    infos["pays"] = pays
    infos["continent"] = continent
    infos["région"] = region

    try:
        genre, espece, note = extraire_informations(image_path)
    except ValueError as e:
        logger.error(str(e))
        raise e
    infos["nom latin"] = f"{genre} {espece}"
    infos["genre"] = genre
    infos["espèce"] = espece
    infos["note"] = note

    try:
        vignette = create_vignette(image_path)
        photo = create_small_image(image_path)
    except Exception as e:
        logger.error(str(e))
        raise e
    infos["vignette"] = vignette
    infos["photo"] = photo

    try:
        common_name, kingdom, sp_class, order = get_specie_info(infos["nom latin"])
    except Exception as e:
        common_name, kingdom, sp_class, order = '', '', '', ''
        logger.error(str(e))
    infos["nom français"] = common_name
    infos["règne"] = kingdom
    infos["classe"] = sp_class
    infos["catégorie"] = order

    try:
        jour, annee = get_date_taken(image_path)
    except Exception as e:
        logger.error(str(e))
        raise e

    infos["jour"] = jour
    infos["année"] = annee

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
    value = title.split(' ')
    if len(value) == 2 or len(value) == 3:
        return value[0], value[1], ''
    elif len(value) > 3:
        return value[0], value[1], ' '.join(value[2:-1])
    else:
        raise ValueError(f"{title} ne correspond pas au format attendu Genre espèce (note) identifiant")


def get_location_from_path(image_path):
    folders = image_path.replace(PHOTO_PATH + "/", '').split(os.sep)
    if len(folders) >= 2:  # Exemple : pays/région/photo.jpeg
        pays = folders[0]
        region = folders[1]
    elif len(folders) == 2:  # Exemple : pays/photo.jpeg
        pays = folders[0]
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

    return '', ''


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


def get_specie_info(scientific_name):
    t = taxoniq.Taxon(scientific_name=scientific_name)
    infos = dict([(t.rank.name, t.scientific_name) for t in t.ranked_lineage])
    try:
        t.common_name
    except taxoniq.NoValue:
        raise ValueError("Espèce {} non détectée".format(scientific_name))
    else:
        try:
            common_name_fr = GoogleTranslator(source='en', target='fr').translate(t.common_name)
        except httpcore._exceptions.ConnectError:
            infos['common_name'] = t.common_name
        else:
            infos['common_name'] = common_name_fr
    return infos['common_name'], infos['kingdom'], infos['class'], infos['order']

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


def create_vignette(image_path):
    output_path = vignette_path(image_path)
    resize_image(image_path, output_path, 300)
    return output_path.replace(str(MEDIA_ROOT) + "/", str(MEDIA_URL))
