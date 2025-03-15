import json

from asgiref.sync import async_to_sync
from asgiref.sync import sync_to_async
from channels.layers import get_channel_layer
from django.http import JsonResponse

from main.core.backend.logger.logger import logger
from main.core.backend.load_data.upload_images.internal.add_one_value import add_specie, add_photo
from main.core.backend.load_data.upload_images.internal.create_image import create_images
from main.core.backend.load_data.upload_images.internal.delete_images import delete_images
from main.core.backend.load_data.upload_images.internal.get_one_value import get_specie_data, get_photo_value


def upload_images(request):
    if request.method == "POST":
        async_to_sync(process_images)(request)
        return JsonResponse({"message": "Traitement en cours"}, status=202)

    return JsonResponse({"error": "Invalid request"}, status=400)


async def send_progress(progress):
    channel_layer = get_channel_layer()
    await channel_layer.group_send(
        "progress_group",
        {
            "type": "progress_update",
            "message": progress
        }
    )

async def process_images(request):
    images = []
    if "images" in request.FILES:
        images = request.FILES.getlist("images")
    image_to_delete = json.loads(request.POST.get("imageToDelete"))
    metadata = json.loads(request.POST.get("metadata"))
    results = []
    if len(metadata) > 0:
        for index, (image, meta) in enumerate(zip(images, metadata)):
            await treatment_image(image, meta, index)

    await sync_to_async(delete_images)(image_to_delete)

    await send_progress("DONE")
    return image_to_delete, results


async def treatment_image(image, metadata, i):
    info_photo = get_photo_value(metadata)
    create_images(image, metadata['filepath'])
    info_specie = await get_specie_data(info_photo['latin_name'])
    if info_specie:
        await sync_to_async(add_specie, thread_sensitive=True)(info_specie)
    await sync_to_async(add_photo, thread_sensitive=True)(info_photo)

    print(f"espèce {i} : {info_photo['latin_name']}")
    logger.info(f"espèce {i} : {info_photo['latin_name']}")
    await send_progress(i + 1)
