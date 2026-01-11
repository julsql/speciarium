import json

from asgiref.sync import sync_to_async, async_to_sync
from channels.layers import get_channel_layer
from django.db import transaction
from django.db.models import F
from django.http import JsonResponse

from main.core.backend.load_data.upload_images.internal.add_one_value import add_specie, add_photo
from main.core.backend.load_data.upload_images.internal.create_image import create_images
from main.core.backend.load_data.upload_images.internal.delete_images import delete_images
from main.core.backend.load_data.upload_images.internal.get_one_value import get_specie_data, get_photo_value
from main.core.backend.logger.logger import logger
from main.models.upload_action import UploadAction


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
            "images_uploaded": 0,
            "images_deleted": 0
        }
    )

    images = []
    if "images" in request.FILES:
        images = request.FILES.getlist("images")
    image_to_delete = json.loads(request.POST.get("imageToDelete", "[]"))
    await send_progress("Début de la suppression des images")
    await sync_to_async(delete_images)(image_to_delete, collection_id)

    deleted_count = len(image_to_delete)
    if deleted_count:
        await sync_to_async(
            UploadAction.objects.filter(upload_id=upload_id).update
        )(
            images_deleted=F("images_deleted") + deleted_count,
        )

    metadata = json.loads(request.POST.get("metadata"))
    results = []

    await send_progress("Début du traitement des images")
    if len(metadata) > 0:
        for index, (image, meta) in enumerate(zip(images, metadata)):
            try:
                await treatment_image(image, meta, index, collection_id, upload_id)
                await sync_to_async(
                    lambda: UploadAction.objects.filter(upload_id=upload_id).update(
                        images_uploaded=F("images_uploaded") + 1
                    )
                )()
            except Exception as e:
                logger.error(e)
                await send_progress(str(e))

    await send_progress("Done")
    return image_to_delete, results


async def treatment_image(image, metadata, i, collection_id, upload_action_id):
    info_photo = get_photo_value(metadata, collection_id)
    create_images(image, metadata['filepath'], collection_id)
    info_specie = await get_specie_data(info_photo['latin_name'])
    if info_specie:
        await sync_to_async(add_specie, thread_sensitive=True)(info_specie)
    await sync_to_async(add_photo, thread_sensitive=True)(info_photo, collection_id, upload_action_id)

    print(f"espèce {i} : {info_photo['latin_name']}")
    logger.info(f"espèce {i} : {info_photo['latin_name']}")
    await send_progress(i + 1)
