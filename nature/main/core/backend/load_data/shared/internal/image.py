import os

def resize_image(img, size: int):
    width_percent = (size / float(img.size[0]))
    height_size = int((float(img.size[1]) * float(width_percent)))
    return img.resize((size, height_size))

def create_directories(path):
    if not os.path.exists(path):
        os.makedirs(path)
