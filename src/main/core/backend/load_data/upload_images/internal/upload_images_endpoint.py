import json
from collections import defaultdict, deque

from asgiref.sync import sync_to_async, async_to_sync
from channels.layers import get_channel_layer
from django.db.models import F
from django.db.models.functions import Greatest
from django.http import JsonResponse

from main.core.backend.load_data.upload_images.internal.add_one_value import add_specie, add_photo
from main.core.backend.load_data.upload_images.internal.create_image import create_images
from main.core.backend.load_data.upload_images.internal.delete_images import delete_images
from main.core.backend.load_data.upload_images.internal.get_one_value import get_specie_data, get_photo_value
from main.core.backend.logger.logger import logger
from main.core.permissions import deny_demo_user
from main.models.photo import Photos
from main.models.upload_action import UploadAction


@deny_demo_user
def upload_images(request, collection_id):
    if request.method == "POST":
        async_to_sync(process_images)(request, collection_id)
        return JsonResponse({"message": "Traitement en cours"}, status=202)

    return JsonResponse({"error": "Invalid request"}, status=400)


async def send_progress(progress):
    try:
        channel_layer = get_channel_layer()
        await channel_layer.group_send(
            "progress_group",
            {
                "type": "progress_update",
                "message": progress
            }
        )
    except Exception as e:
        logger.error(e)


async def process_images(request, collection_id):
    upload_id = request.POST.get("upload_id")

    await sync_to_async(UploadAction.objects.get_or_create)(
        upload_id=upload_id,
        defaults={
            "user": request.user,
            "collection_id": collection_id,
        }
    )

    existing_hashes = await sync_to_async(lambda: set(
        Photos.objects.filter(collection_id=collection_id).values_list('hash', flat=True)
    ))()

    images = []
    if "images" in request.FILES:
        images = request.FILES.getlist("images")
    image_to_delete = json.loads(request.POST.get("imageToDelete", "[]"))

    await send_progress("Début de la suppression des images")
    deleted_origins = await sync_to_async(delete_images)(image_to_delete, collection_id)

    if image_to_delete:
        await sync_to_async(UploadAction.objects.filter(upload_id=upload_id).update)(
            images_deleted=F("images_deleted") + len(image_to_delete),
        )

    metadata = json.loads(request.POST.get("metadata"))
    results = []

    await send_progress("Début du traitement des images")
    if len(metadata) > 0:
        for index, (image, meta) in enumerate(zip(images, metadata)):
            try:
                is_new = await treatment_image(image, meta, index, collection_id, upload_id, existing_hashes)
                if is_new:
                    await sync_to_async(UploadAction.objects.filter(upload_id=upload_id).update)(
                        images_uploaded=F("images_uploaded") + 1,
                    )
                else:
                    await sync_to_async(UploadAction.objects.filter(upload_id=upload_id).update)(
                        images_changed=F("images_changed") + 1,
                        images_deleted=Greatest(F("images_deleted") - 1, 0),
                    )
            except Exception as e:
                logger.error(e)
                await send_progress(str(e))

    await reassign_rename_origins(upload_id, deleted_origins)

    await send_progress("Done")
    return image_to_delete, results


@sync_to_async
def reassign_rename_origins(upload_id, deleted_origins):
    """
    Pour chaque photo supprimée puis re-ajoutée avec le même hash dans cet
    upload (= rename), restaure l'upload_action_id d'origine sur la nouvelle
    ligne Photos. Ainsi Photos.upload_action_id pointe toujours vers l'upload
    qui a introduit le contenu pour la première fois, pas vers le rename.
    """
    if not deleted_origins:
        return
    hash_to_origins = defaultdict(deque)
    for hash_value, original_id in deleted_origins:
        if original_id is not None:
            hash_to_origins[hash_value].append(original_id)

    for hash_value, original_ids in hash_to_origins.items():
        while original_ids:
            original_id = original_ids.popleft()
            photo = Photos.objects.filter(
                upload_action_id=upload_id,
                hash=hash_value,
            ).first()
            if not photo:
                break
            photo.upload_action_id = original_id
            photo.save(update_fields=['upload_action_id'])


async def treatment_image(image, metadata, i, collection_id, upload_action_id, existing_hashes):
    info_photo = get_photo_value(metadata, collection_id)
    create_images(image, metadata['filepath'], collection_id)
    info_specie = await get_specie_data(info_photo['latin_name'])
    if info_specie:
        await sync_to_async(add_specie, thread_sensitive=True)(info_specie)
    await sync_to_async(add_photo, thread_sensitive=True)(info_photo, collection_id, upload_action_id)

    print(f"espèce {i} : {info_photo['latin_name']}")
    logger.info(f"espèce {i} : {info_photo['latin_name']}")
    await send_progress(i + 1)

    return info_photo.get('hash') not in existing_hashes
