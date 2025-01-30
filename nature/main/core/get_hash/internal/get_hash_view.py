import unicodedata

from django.http import HttpResponseBadRequest, HttpRequest, JsonResponse

from config.settings import MEDIA_URL
from main.models.photo import Photos
import os

SMALL_PATH = os.path.join(MEDIA_URL, 'main/images/small/')

def get_hash(request: HttpRequest):
    if request.method == 'GET':
        values = Photos.objects.values('hash', 'photo')
        result = [f"{get_title_from_path(photo['photo'])}:{photo['hash']}" for photo in values]

        return JsonResponse({"keys": result})
    return HttpResponseBadRequest("Requête GET demandée")

def normaliser_unicode(texte):
    return unicodedata.normalize('NFC', texte)

def get_title_from_path(path: str):
    return normaliser_unicode(path.replace(SMALL_PATH, ""))
