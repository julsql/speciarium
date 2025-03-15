import os
from io import BytesIO

from PIL import Image
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage

from main.core.backend.load_data.shared.internal.image import resize_image, create_directories


def create_images(image_file, path: str):
    thumbnail_path = os.path.join('main/images/vignettes', path)
    small_image_path = os.path.join('main/images/small', path)

    create_thumbnail(image_file, thumbnail_path, 300)
    create_small_image(image_file, small_image_path, 1000)


def create_thumbnail(image_file, path: str, size: int):
    (img, image_format) = resize_uploaded_image(image_file, size)
    save_image(img, path, image_format)


def create_small_image(image_file, path: str, size: int):
    (img, image_format) = resize_uploaded_image(image_file, size)
    save_image(img, path, image_format)


def resize_uploaded_image(image_file, size: int):
    img = Image.open(image_file)
    new_img = resize_image(img, size)
    return new_img, img.format


def save_image(image, path, image_format):
    create_directories(os.path.dirname(path))

    buffer = BytesIO()
    image.save(buffer, format=image_format)  # Garde le format original (JPEG, PNG, etc.)
    buffer.seek(0)

    # Sauvegarder le fichier redimensionné
    default_storage.save(path, ContentFile(buffer.read()))
