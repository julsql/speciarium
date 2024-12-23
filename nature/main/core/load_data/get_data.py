import os
from datetime import datetime

import httpcore
from PIL import Image
import taxoniq
from deep_translator import GoogleTranslator
import yaml
from main.core.logger.logger import logger
from config.settings import MEDIA_ROOT, BASE_DIR

PHOTO_PATH = os.path.join(MEDIA_ROOT, 'main/images/originales')
VIGNETTE_PATH = os.path.join(MEDIA_ROOT, 'main/images/vignettes')
SMALL_PATH = os.path.join(MEDIA_ROOT, 'main/images/small')
continents_yaml = os.path.join(BASE_DIR, "main/core/load_data/continents.yml")

def get_dataset_on_each_image():
    folder_path = PHOTO_PATH
    all_image_path = images_in_folder(folder_path)

    infos_all_images = []
    for image_path in all_image_path:
        try:
            infos_all_images.append(get_info(image_path))
        except Exception as e:
            logger.error(e)

    return infos_all_images

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


def get_info(image_path):
    champ = ["nom latin", "genre", "espèce", "nom français", "règne", "classe", "catégorie", "année", "jour", "continent","pays", "région", "lieu", "photo", "vignette", "titre", "note"]


    infos = {}
    for key in champ:
        infos[key] = None

    folders = image_path.replace(PHOTO_PATH, '').split("/")

    infos["pays"] = folders[1]
    infos["continent"] = trouver_continent(infos["pays"])
    infos["région"] = folders[2]

    file_name = os.path.basename(image_path).split('.')[0]
    file_tab = file_name.split(" ")



    infos["titre"] = file_name

    infos["nom latin"] = " ".join(file_tab[:2])
    infos["genre"] = file_tab[0]
    infos["espèce"] = file_tab[1]
    if len(file_tab) > 3:
        infos["note"] = " ".join(file_tab[2: -1])
    infos["vignette"] = create_vignette(image_path)
    infos["photo"] = create_small_image(image_path)

    logger.debug(infos)
    infos_specie = get_specie_info(infos["nom latin"])
    if "common_name" in infos_specie:
        infos["nom français"] = infos_specie['common_name']
    infos["règne"] = infos_specie['kingdom']
    infos["classe"] = infos_specie['class']
    infos["catégorie"] = infos_specie['order']
    infos["jour"], infos["année"] = get_date_taken(image_path)


    return infos

def get_date_taken(image_path):
    try:
        exif = Image.open(image_path)._getexif()
        if exif and 36867 in exif:
            timestamp = exif[36867]
            date_taken = datetime.strptime(timestamp, "%Y:%m:%d %H:%M:%S")
            return date_taken.strftime("%d/%m/%Y"), date_taken.strftime("%Y")
    except (AttributeError, KeyError, IndexError, IOError):
        pass
    return None


def charger_fichier_yaml(fichier_yaml):
    with open(fichier_yaml, 'r', encoding='utf-8') as fichier:
        contenu = yaml.load(fichier, Loader=yaml.FullLoader)
    return contenu


contenu_fichier = charger_fichier_yaml(continents_yaml)


def trouver_continent(pays):
    for continent, pays_par_continent in contenu_fichier.items():
        if pays.lower() in map(str.lower, pays_par_continent):
            return continent
    return None


def get_specie_info(scientific_name):
    logger.debug(scientific_name)
    t = taxoniq.Taxon(scientific_name=scientific_name)
    infos = dict([(t.rank.name, t.scientific_name) for t in t.ranked_lineage])
    try:
        t.common_name
    except taxoniq.NoValue:
        pass
    else:
        try:
            common_name_fr = GoogleTranslator(source='en', target='fr').translate(t.common_name)
        except httpcore._exceptions.ConnectError:
            infos['common_name'] = t.common_name
        else:
            infos['common_name'] = common_name_fr
    return infos

def petite_path(image_path):
    return image_path.replace(PHOTO_PATH, SMALL_PATH)

def vignette_path(image_path):
    return image_path.replace(PHOTO_PATH, VIGNETTE_PATH)


def create_directories(path):
    if not os.path.exists(path):
        os.makedirs(path)

def resize_image(input_path, output_path, size=30):
    create_directories(os.path.dirname(output_path))
    with Image.open(input_path) as img:
        width_percent = (size / float(img.size[0]))
        height_size = int((float(img.size[1]) * float(width_percent)))
        new_img = img.resize((height_size, size))
        new_img.save(output_path)

def create_small_image(image_path):
    output_path = petite_path(image_path)
    resize_image(image_path, output_path, 1000)
    return output_path


def create_vignette(image_path):
    output_path = vignette_path(image_path)
    resize_image(image_path, output_path, 100)
    return output_path