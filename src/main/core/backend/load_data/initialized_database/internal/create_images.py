import os

from PIL import Image

from main.core.backend.load_data.shared.internal.image import resize_image, create_directories
from main.core.backend.load_data.shared.internal.info_photo import petite_path, vignette_path


def create_images(image_path, rm_path, collection_id):
    create_thumbnail(image_path, rm_path, collection_id)
    create_small_image(image_path, rm_path, collection_id)


def create_thumbnail(image_path, rm_path, collection_id):
    output_path = vignette_path(image_path, rm_path, collection_id)
    save_resized_image(image_path, output_path, 300)


def create_small_image(image_path, rm_path, collection_id):
    output_path = petite_path(image_path, rm_path, collection_id)
    save_resized_image(image_path, output_path, 1000)


def save_resized_image(input_path, output_path, size):
    create_directories(os.path.dirname(output_path))
    img = Image.open(input_path)
    new_img = resize_image(img, size)
    new_img.save(output_path)
