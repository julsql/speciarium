import os
from pathlib import Path

from django.http import HttpResponseBadRequest, HttpRequest, JsonResponse

from config.settings import MEDIA_URL
from main.core.backend.load_data.shared.internal.info_photo import images_in_folder, VIGNETTE_ROOT, SMALL_ROOT, \
    replace_root, VIGNETTE_PATH, SMALL_PATH, delete_file_with_permission_check, get_latin_name
from main.models.photo import Photos
from main.models.species import Species


def clean_database(request: HttpRequest):
    if request.method == 'GET':
        photo_row_delete, file_delete = compare_file_to_database()
        delete_photos(set(photo_row_delete + file_delete))

        return JsonResponse({"keys": ""})
    return HttpResponseBadRequest("Requête GET demandée")

def get_file_path():
    all_thumbnails_path = images_in_folder(VIGNETTE_ROOT)
    all_small_path = images_in_folder(SMALL_ROOT)

    all_thumbnails_path = rm_basepath(all_thumbnails_path, VIGNETTE_ROOT)
    all_small_path = rm_basepath(all_small_path, SMALL_ROOT)
    return all_thumbnails_path, all_small_path

def get_database_path():
    all_path = list(Photos.objects.values_list('photo', flat=True))

    all_path = rm_basepath(all_path, os.path.join(MEDIA_URL, SMALL_PATH))
    return all_path

def rm_basepath(paths, rm_root):
    return [replace_root(path, str(rm_root), "") for path in paths]

def compare_file_to_database():
    file_thumbnails_path, file_small_path = get_file_path()
    database_path = get_database_path()

    photo_row_to_delete = []
    file_to_delete = list(set(file_thumbnails_path) ^ set(file_small_path))

    file_path = set(file_thumbnails_path) & set(file_small_path)

    for file in file_path:
        file_not_in_database = file not in database_path
        if file_not_in_database:
            file_to_delete.append(file)

    for photo in database_path:
        photo_with_no_file = photo not in file_path
        if photo_with_no_file:
            photo_row_to_delete.append(photo)

    return photo_row_to_delete, file_to_delete

def delete_photos(photo_to_delete):
    for photo_path in photo_to_delete:
        delete_photo(photo_path.lstrip("/"))

def delete_photo(path):
    thumbnail_path = str(Path(MEDIA_URL) / VIGNETTE_PATH / path)
    latin_name = get_latin_name(path)

    Photos.objects.filter(thumbnail=thumbnail_path).delete()
    specie_id = Species.objects.filter(latin_name=latin_name).values_list('id', flat=True).first()
    if specie_id and not Photos.objects.filter(specie_id=specie_id).exists():
        Species.objects.filter(id=specie_id).delete()

    image_small = str(Path(SMALL_ROOT) / path)
    image_vignette = str(Path(VIGNETTE_ROOT) / path)
    delete_file_with_permission_check(image_small)
    delete_file_with_permission_check(image_vignette)
