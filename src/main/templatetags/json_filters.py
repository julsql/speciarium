import html
import json
from datetime import date, datetime

from django import template
from django.utils.safestring import mark_safe

register = template.Library()

FRENCH_DATE_FORMAT = '%d/%m/%Y'


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

@register.filter
def month_name(month_number):
    months = [
        "janvier", "février", "mars", "avril", "mai", "juin",
        "juillet", "août", "septembre", "octobre", "novembre", "décembre"
    ]
    try:
        return months[int(month_number) - 1]
    except (ValueError, IndexError):
        return ""

def format_french_date(value):
    """Formate une date au format français jj/mm/aaaa."""
    if not value:
        return ""
    if isinstance(value, date):
        return value.strftime(FRENCH_DATE_FORMAT)
    value = str(value).strip()
    for source_format in ('%Y-%m-%d', FRENCH_DATE_FORMAT):
        try:
            return datetime.strptime(value, source_format).strftime(FRENCH_DATE_FORMAT)
        except ValueError:
            continue
    return value


def get_info(image):
    return f"Photo prise le {format_french_date(image['date'])} en {image['country']}" + (f" ({image['region']})" if image.get('region') else "") + (f". {image['details']}" if image.get('details') else "")

def get_title(record):
    if record.get('specie__french_name'):
        return f"{record['specie__french_name']} - <i>{record['specie__latin_name']}</i>"
    else:
        return f"<i>{record['specie__latin_name']}</i>"

def get_latitude(image):
    return float(image['latitude']) if image.get('latitude') and image['latitude'] != 'null' else None

def get_longitude(image):
    return float(image['longitude']) if image.get('longitude') and image['longitude'] != 'null' else None