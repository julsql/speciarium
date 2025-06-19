from datetime import datetime

from django.contrib.postgres.aggregates import StringAgg
from django.db.models import Value, F, Min, TextField, Func, Q
from django.db.models.functions import Coalesce, Round, Cast, Lower
from django_tables2 import RequestConfig

from main.core.frontend.advanced_search_result.internal.table import SpeciesTable
from main.models.photo import Photos


def filter_queryset(queryset, form, filter_mappings):
    onomastic_search = ['specie__latin_name',
                        'specie__genus',
                        'specie__species',
                        'specie__french_name',
                        'specie__class_field',
                        'specie__order_field',
                        'specie__family']

    for form_field, model_field in filter_mappings.items():
        value = form.cleaned_data.get(form_field)
        if value:
            if model_field in onomastic_search:
                queryset = queryset.annotate(
                    unaccented_field=Func(Lower(f"{model_field}"), function="unaccent")
                ).filter(
                    unaccented_field__icontains=Func(Value(value.lower()), function="unaccent")
                )
            else:
                queryset = queryset.filter(**{model_field: value})
    return queryset


def annotate_queryset(queryset):
    return queryset.values(
        'specie__latin_name', 'specie__genus', 'specie__species', 'specie__french_name',
        'specie__kingdom', 'specie__class_field', 'specie__order_field', 'specie__family'
    ).annotate(
        min_year=Min('year'),

        # Concaténation de valeurs sous PostgreSQL
        year_list=StringAgg(Coalesce(Cast(F('year'), TextField()), Value('')), delimiter=','),
        date_list=StringAgg(Coalesce(Cast(F('date'), TextField()), Value('')), delimiter=','),
        continent_list=StringAgg(Coalesce(F('continent'), Value('')), delimiter=','),
        first_continent=Min('continent'),
        country_list=StringAgg(Coalesce(F('country'), Value('')), delimiter=','),
        first_country=Min('country'),
        region_list=StringAgg(Coalesce(F('region'), Value('')), delimiter=','),
        first_region=Min('region'),
        details_list=StringAgg(Coalesce(F('details'), Value('')), delimiter=','),
        photo_list=StringAgg(Coalesce(F('photo'), Value('')), delimiter=','),
        thumbnail_list=StringAgg(Coalesce(F('thumbnail'), Value('')), delimiter=','),

        # Convertir les nombres en texte avant la concaténation
        latitude_list=StringAgg(Coalesce(Cast(F('latitude'), TextField()), Value('')), delimiter=','),
        longitude_list=StringAgg(Coalesce(Cast(F('longitude'), TextField()), Value('')), delimiter=','),
    )


def convert_date_format(date):
    try:
        return datetime.strptime(date, '%Y-%m-%d').strftime('%d/%m/%Y')
    except ValueError:
        return ''


def get_number(thumbnail_path):
    return thumbnail_path.split(" ")[-1]

def transform_entry(entry):
    images = []
    year_list = entry['year_list'].split(',')
    date_list = entry['date_list'].split(',')
    continent_list = entry['continent_list'].split(',')
    country_list = entry['country_list'].split(',')
    region_list = entry['region_list'].split(',')
    photo_list = entry['photo_list'].split(',')
    details_list = entry['details_list'].split(',')
    thumbnail_list = entry['thumbnail_list'].split(',')
    latitude_list = entry['latitude_list'].split(',')
    longitude_list = entry['longitude_list'].split(',')

    for i in range(len(photo_list)):
        images.append({
            'year': year_list[i] if year_list[i] else '',
            'date': convert_date_format(date_list[i]) if date_list[i] else '',
            'continent': continent_list[i] if continent_list[i] else '',
            'country': country_list[i] if country_list[i] else '',
            'region': region_list[i] if region_list[i] else '',
            'photo': photo_list[i] if photo_list[i] else '',
            'details': details_list[i] if details_list[i] else '',
            'thumbnail': thumbnail_list[i] if thumbnail_list[i] else '',
            'latitude': latitude_list[i] if longitude_list[i] else 'null',
            'longitude': longitude_list[i] if longitude_list[i] else 'null',
            'number_picture': get_number(thumbnail_list[i]) if thumbnail_list[i] else '',
        })

    entry['all_photos'] = images

    if entry['continent_list']:
        entry['continent_list'] = set(continent_list)
    if entry['country_list']:
        entry['country_list'] = set(country_list)
    if entry['region_list']:
        entry['region_list'] = set(region_list)
    return entry


def process_queryset(queryset):
    queryset = list(queryset)
    for entry in queryset:
        transform_entry(entry)
    return queryset


def configure_table(request, queryset):
    per_page = request.GET.get("per_page", 25)
    try:
        # Vérifier si per_page est un entier valide
        per_page = int(per_page)
        if per_page <= 0:  # Sécurité pour éviter les valeurs invalides
            per_page = 25
    except ValueError:
        per_page = 25
    table = SpeciesTable(queryset)
    RequestConfig(request, paginate={"per_page": per_page}).configure(table)
    return table


def advanced_search_result(request, form):
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
        'continent': 'continent',
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
