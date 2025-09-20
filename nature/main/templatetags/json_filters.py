import html
import json

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def get_images_json(record):
    title = get_title(record)
    info = get_info(record)

    data = {
        "full": html.escape(record['photo']),
        "thumbnail": html.escape(record['thumbnail']),
        "title": html.escape(title),
        "latitude": get_latitude(record),
        "longitude": get_longitude(record),
        "info": html.escape(info),
        "name": html.escape(record["number_picture"])
    }

    return mark_safe(json.dumps([data]))


@register.filter
def get_all_images_json(record):
    """
    Retourne une liste de dictionnaires représentant les photos
    associées à un record, sérialisée en JSON et marquée comme safe.
    """
    images = []

    title = get_title(record)
    for image in record.get("all_photos"):
        info = get_info(image)

        images.append({
            "full": html.escape(image['photo']),
            "thumbnail": html.escape(image['thumbnail']),
            "title": html.escape(title),
            "latitude": get_latitude(image),
            "longitude": get_longitude(image),
            "info": html.escape(info),
            "name": html.escape(image['number_picture'])
        })

    return mark_safe(json.dumps(images))

def get_info(image):
    return f"Photo prise le {image['date']} en {image['country']}" + (f" ({image['region']})" if image.get('region') else "") + (f". {image['details']}" if image.get('details') else "")

def get_title(record):
    if record.get('specie__french_name'):
        return f"{record['specie__french_name']} - <i>{record['specie__latin_name']}</i>"
    else:
        return f"<i>{record['specie__latin_name']}</i>"

def get_latitude(image):
    return float(image['latitude']) if image.get('latitude') and image['latitude'] != 'null' else None

def get_longitude(image):
    return float(image['longitude']) if image.get('longitude') and image['longitude'] != 'null' else None