from datetime import datetime

from django.db.models import Min
from django_tables2 import RequestConfig

from main.core.advanced_search_result.internal.group_concat import GroupConcat
from main.core.advanced_search_result.internal.table import SpeciesTable
from main.models.species import Species

def filter_queryset(queryset, form, filter_mappings):
    for form_field, model_field in filter_mappings.items():
        value = form.cleaned_data.get(form_field)
        if value:
            queryset = queryset.filter(**{model_field: value})
    return queryset


def annotate_queryset(queryset):
    return queryset.values(
        'latin_name', 'genus', 'species', 'french_name',
        'class_field', 'order_field', 'family'
    ).annotate(
        min_year=Min('year'),
        year_list=GroupConcat('year', delimiter=','),
        date_list=GroupConcat('date', delimiter=','),
        continent_list=GroupConcat('continent', delimiter=','),
        first_continent=Min('continent'),
        country_list=GroupConcat('country', delimiter=','),
        first_country=Min('country'),
        region_list=GroupConcat('region', delimiter=','),
        first_region=Min('region'),
        details_list=GroupConcat('details', delimiter=','),
        photo_list=GroupConcat('photo', delimiter=','),
        thumbnail_list=GroupConcat('thumbnail', delimiter=','),
    )

def convert_date_format(date):
    return datetime.strptime(date, '%Y-%m-%d').strftime('%d/%m/%Y')

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

    for i in range(len(year_list)):
        images.append({
            'year': year_list[i],
            'date': convert_date_format(date_list[i]),
            'continent': continent_list[i],
            'country': country_list[i],
            'region': region_list[i],
            'photo': photo_list[i],
            'details': details_list[i],
            'thumbnail': thumbnail_list[i]
        })

    entry['image1'] = images[0]
    entry['image2'] = images[1] if len(images) > 1 else None
    entry['image3'] = images[2] if len(images) > 2 else None

    # Convert lists to sets for distinct values
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
    table = SpeciesTable(queryset)
    RequestConfig(request, paginate={"per_page": 10}).configure(table)
    return table




def advanced_search_result(request, form):
    queryset = Species.objects.all()
    filter_mappings = {
        'latin_name': 'latin_name__icontains',
        'genus': 'genus__icontains',
        'species': 'species__icontains',
        'french_name': 'french_name__icontains',
        'class_field': 'class_field__icontains',
        'order_field': 'order_field__icontains',
        'family': 'family__icontains',
        'year': 'year',
        'date': 'date__icontains',
        'continent': 'continent',
        'country': 'country',
        'region': 'region',
        'details': 'details__icontains',
    }

    if form.is_valid():
        queryset = filter_queryset(queryset, form, filter_mappings)

    queryset = annotate_queryset(queryset)
    total_results = queryset.count()
    queryset = process_queryset(queryset)
    table = configure_table(request, queryset)

    return table, total_results
