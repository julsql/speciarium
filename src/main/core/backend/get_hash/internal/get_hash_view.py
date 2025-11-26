import unicodedata

from django.http import HttpResponseBadRequest, HttpRequest, JsonResponse

from config.settings import MEDIA_URL
from main.models.photo import Photos
import os

def SMALL_PATH(collection_id):
    return os.path.join(MEDIA_URL, 'main/images', str(collection_id), 'small/')

def get_hash(request: HttpRequest, collection_id):
    if request.method == 'GET':
        values = Photos.objects.filter(collection=collection_id).values('hash', 'photo')
        result = [f"{get_title_from_path(photo['photo'], collection_id)}:{photo['hash']}" for photo in values]

        return JsonResponse({"keys": result})
    return HttpResponseBadRequest("Requête GET demandée")

def normaliser_unicode(texte):
    return unicodedata.normalize('NFC', texte)

def get_title_from_path(path: str, collection_id):
    return normaliser_unicode(path.replace(SMALL_PATH(collection_id), ""))
