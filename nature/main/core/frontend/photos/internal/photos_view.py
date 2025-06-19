from django.contrib.auth.decorators import login_required
from django.db.models.functions import Round
from django.http import HttpResponse, HttpRequest
from django.shortcuts import render
from django_tables2 import RequestConfig

from main.core.frontend.advanced_search.internal.advanced_search_view import advanced_search
from main.core.frontend.advanced_search_result.internal.advanced_search_result_view import filter_queryset, get_number
from main.core.frontend.photos.internal.table import PhotosTable
from main.models.map_tiles import MapTiles
from main.models.photo import Photos


@login_required
def photos(request: HttpRequest) -> HttpResponse:
    if request.user.map_tiles:
        map_server = request.user.map_tiles.server
    else:
        map_server = MapTiles.objects.all().first().server

    form, continents, years, countries, regions, kingdoms, classes, orders = advanced_search(request)
    value = {'form': form,
             'continents': continents,
             'years': years,
             'countries': countries,
             'regions': regions,
             'kingdoms': kingdoms,
             'classes': classes,
             'orders': orders}

    table, total_results = advanced_search_result_map(request, form)
    value.update({'table': table, 'total_results': total_results, 'page': "photos", 'map_server' : map_server})

    return render(request, 'photos/module.html', value)


def annotate_queryset(queryset):
    return queryset.values(
        'specie__latin_name', 'specie__genus', 'specie__species', 'specie__french_name',
        'specie__kingdom', 'specie__class_field', 'specie__order_field', 'specie__family',
        'year', "date", 'continent', 'country', 'region', 'latitude', 'longitude',
        'thumbnail', 'photo')


def advanced_search_result_map(request, form):
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
        'kingdom': 'specie__kingdom',
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
    queryset = process_queryset(queryset)
    table = configure_table(request, queryset)

    return table, total_results


def convert_date_format(date):
    try:
        return date.strftime('%d/%m/%Y')
    except (ValueError, AttributeError):
        return ''


def convert_coordinates(longitude, latitude):
    try:
        return f'{latitude:.3f}, {longitude:.3f}'
    except (TypeError, ValueError):
        return ''


def configure_table(request, queryset):
    per_page = request.GET.get("per_page", 25)
    try:
        # Vérifier si per_page est un entier valide
        per_page = int(per_page)
        if per_page <= 0:  # Sécurité pour éviter les valeurs invalides
            per_page = 25
    except ValueError:
        per_page = 25
    table = PhotosTable(queryset)
    RequestConfig(request, paginate={"per_page": per_page}).configure(table)
    return table


def process_queryset(queryset):
    queryset = list(queryset)
    for entry in queryset:
        transform_entry(entry)
    return queryset


def transform_entry(entry):
    entry['date'] = convert_date_format(entry['date'])
    entry['latitude'] = entry['latitude'] if entry['latitude'] else 'null'
    entry['longitude'] = entry['longitude'] if entry['longitude'] else 'null'
    entry['coordinates'] = convert_coordinates(entry['latitude'], entry['longitude'])
    entry['number_picture'] = get_number(entry['thumbnail'])
    return entry
