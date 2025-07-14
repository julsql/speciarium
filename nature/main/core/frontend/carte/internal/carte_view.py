import html
import json

from django.contrib.auth.decorators import login_required
from django.db.models.functions import Round
from django.http import HttpResponse, HttpRequest
from django.shortcuts import render

from main.core.frontend.advanced_search.internal.advanced_search_view import advanced_search
from main.core.frontend.advanced_search_result.internal.advanced_search_result_view import filter_queryset
from main.models.map_tiles import MapTiles
from main.models.photo import Photos


@login_required
def carte(request: HttpRequest) -> HttpResponse:
    form, continents, years, countries, regions, kingdoms, classes, orders = advanced_search(request)
    value = {'form': form,
             'continents': continents,
             'years': years,
             'countries': countries,
             'regions': regions,
             'kingdoms': kingdoms,
             'classes': classes,
             'orders': orders}

    results, total_results = advanced_search_result_map(form, request)

    if request.user.map_tiles:
        map_server = request.user.map_tiles.server
    else:
        map_server = MapTiles.objects.all().first().server

    json_results = to_json(results)

    value.update({
        'json_results': json_results,
        'total_results': total_results,
        'page': "photos",
        'map_server': map_server
    })

    return render(request, 'carte/module.html', value)


def to_json(results):
    images_data = []
    for image in results:
        if image.get('specie__french_name'):
            title = f"{image['specie__french_name']} - <i>{image['specie__latin_name']}</i>"
        else:
            title = f"<i>{image['specie__latin_name']}</i>"

        info = f"Photo prise le {image['date']} en {image['country']}" + (f" ({image['region']})" if image.get('region') else "") + (f". {image['details']}" if image.get('details') else "")

        images_data.append({
            "full": html.escape(image['photo']),
            "thumbnail": html.escape(image['thumbnail']),
            "title": html.escape(title),
            "latitude": float(image['latitude']) if image.get('latitude') and image['latitude'] != 'null' else None,
            "longitude": float(image['longitude']) if image.get('longitude') and image['longitude'] != 'null' else None,
            "info": html.escape(info)
        })

    return json.dumps(images_data, ensure_ascii=False)


def annotate_queryset(queryset):
    return queryset.values(
        'specie__latin_name', 'specie__genus', 'specie__species', 'specie__french_name',
        'specie__class_field', 'specie__order_field', 'specie__family', 'year', "date",
        'continent', 'country', 'region', 'latitude', 'longitude', 'thumbnail', 'photo')


def advanced_search_result_map(form, request):
    if request.user.current_collection:
        collection = request.user.current_collection
    else:
        collection = request.user.collections.all().first()

    queryset = Photos.objects.select_related('specie').filter(collection=collection)
    filter_mappings = {
        'latin_name': 'specie__latin_name',
        'genus': 'specie__genus',
        'species': 'specie__species',
        'french_name': 'specie__french_name',
        'class_field': 'specie__class_field',
        'order_field': 'specie__order_field',
        'family': 'specie__family',
        'year': 'year',
        'continent': 'continent__icontains',
        'country': 'country',
        'region': 'region',
        'details': 'details__icontains',
    }

    if form.is_valid():
        data = form.cleaned_data
        queryset = filter_queryset(queryset, form, filter_mappings)

        start_date = data.get("start_date")
        end_date = data.get("end_date")

        latitude = data.get("latitude")
        longitude = data.get("longitude")

        decimal_coordinates = 3

        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        elif start_date:
            queryset = queryset.filter(date__gte=start_date)
        elif end_date:
            queryset = queryset.filter(date__lte=end_date)
        if latitude:
            queryset = queryset.annotate(
                rounded_latitude=Round('latitude', decimal_coordinates)
            ).filter(rounded_latitude=round(latitude, decimal_coordinates))
        if longitude:
            queryset = queryset.annotate(
                rounded_longitude=Round('longitude', decimal_coordinates)
            ).filter(rounded_longitude=round(longitude, decimal_coordinates))

    queryset = annotate_queryset(queryset)
    total_results = queryset.count()
    result_list = process_queryset(queryset)

    return result_list, total_results


def convert_date_format(date):
    try:
        return date.strftime('%d/%m/%Y')
    except (ValueError, AttributeError):
        return ''


def convert_coordinates(longitude, latitude):
    try:
        return f'{latitude:.3f}, {longitude:.3f}'
    except TypeError:
        return ''


def process_queryset(queryset):
    result_list = list(queryset)
    for entry in result_list:
        transform_entry(entry)
    return result_list


def transform_entry(entry):
    entry['date'] = convert_date_format(entry['date'])
    entry['coordinates'] = convert_coordinates(entry['latitude'], entry['longitude'])
    entry['latitude'] = (f"{entry['latitude']:.6f}" if entry['latitude'] is not None else 'null')
    entry['longitude'] = (f"{entry['longitude']:.6f}" if entry['longitude'] is not None else 'null')
    return entry
