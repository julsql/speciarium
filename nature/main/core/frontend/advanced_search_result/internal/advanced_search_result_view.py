from datetime import datetime

from django.db.models import Min
from django_tables2 import RequestConfig

from main.core.frontend.advanced_search_result.internal.group_concat import GroupConcat
from main.core.frontend.advanced_search_result.internal.table import SpeciesTable
from main.models.photo import Photos

def filter_queryset(queryset, form, filter_mappings):
    for form_field, model_field in filter_mappings.items():
        value = form.cleaned_data.get(form_field)
        if value:
            queryset = queryset.filter(**{model_field: value})
    return queryset


def annotate_queryset(queryset):
    return queryset.values(
        'specie__latin_name', 'specie__genus', 'specie__species', 'specie__french_name',
        'specie__class_field', 'specie__order_field', 'specie__family'
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
    try:
        return datetime.strptime(date, '%Y-%m-%d').strftime('%d/%m/%Y')
    except ValueError:
        return ''

def transform_entry(entry):
    images = []
    year_list = entry['year_list'].split(',') if entry['year_list'] else []
    date_list = entry['date_list'].split(',') if entry['date_list'] else []
    continent_list = entry['continent_list'].split(',')
    country_list = entry['country_list'].split(',')
    region_list = entry['region_list'].split(',')
    photo_list = entry['photo_list'].split(',')
    details_list = entry['details_list'].split(',')
    thumbnail_list = entry['thumbnail_list'].split(',')

    n = len(photo_list)
    if len(year_list) < n:
        year_list += [''] * (n - len(year_list))
    if len(date_list) < n:
        date_list += [''] * (n - len(date_list))

    for i in range(n):
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

    entry['all_photos'] = images

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
    queryset = Photos.objects.select_related('specie').all()
    filter_mappings = {
        'latin_name': 'specie__latin_name__icontains',
        'genus': 'specie__genus__icontains',
        'species': 'specie__species__icontains',
        'french_name': 'specie__french_name__icontains',
        'class_field': 'specie__class_field__icontains',
        'order_field': 'specie__order_field__icontains',
        'family': 'specie__family__icontains',
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

        if start_date and end_date:
            queryset = queryset.filter(date__range=[start_date, end_date])
        elif start_date:
            queryset = queryset.filter(date__gte=start_date)
        elif end_date:
            queryset = queryset.filter(date__lte=end_date)

    queryset = annotate_queryset(queryset)
    total_results = queryset.count()
    queryset = process_queryset(queryset)
    table = configure_table(request, queryset)

    return table, total_results
