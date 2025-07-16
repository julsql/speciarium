import html
import json

from django import template
from django.utils.safestring import mark_safe

register = template.Library()


@register.filter
def get_images_json(record):

    if record.get('specie__french_name'):
        title = f"{record['specie__french_name']} - <i>{record['specie__latin_name']}</i>"
    else:
        title = f"<i>{record['specie__latin_name']}</i>"

    info = f"Photo prise le {record['date']} en {record['country']}" + (f" ({record['region']})" if record.get('region') else "") + (f". {record['details']}" if record.get('details') else "")

    data = {
        "full": html.escape(record['photo']),
        "thumbnail": html.escape(record['thumbnail']),
        "title": html.escape(title),
        "latitude": float(record['latitude']) if record.get('latitude') and record['latitude'] != 'null' else None,
        "longitude": float(record['longitude']) if record.get('longitude') and record['longitude'] != 'null' else None,
        "info": html.escape(info)
    }

    return mark_safe(json.dumps([data]))
