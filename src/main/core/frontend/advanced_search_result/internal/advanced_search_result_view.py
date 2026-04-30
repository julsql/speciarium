from datetime import datetime

from django.contrib.postgres.aggregates import StringAgg
from django.db.models import Value, F, Min, TextField, Func, Q, Count
from django.db.models.functions import Coalesce, Round, Cast, Lower
from django_tables2 import RequestConfig

from main.core.frontend.advanced_search_result.internal.grouped_table import (
    GroupedResultsTable,
    make_comparison_table,
)
from main.core.frontend.advanced_search_result.internal.table import SpeciesTable
from main.models.collection import Collection
from main.models.photo import Photos


GROUP_BY_FIELDS = {
    "Pays": "country",
    "Continent": "continent",
    "Région": "region",
    "Année": "year",
    "Règne": "specie__kingdom",
    "Classe": "specie__class_field",
    "Ordre": "specie__order_field",
    "Famille": "specie__family",
    "Espèce": "specie__latin_name",
}


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
        year_list=StringAgg(
            Coalesce(Cast(F('year'), TextField()), Value('')),
            delimiter=',',
            ordering=F('date').desc()),
        date_list=StringAgg(
            Coalesce(Cast(F('date'), TextField()), Value('')),
            delimiter=',',
            ordering=F('date').desc()),
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
    picture_name = thumbnail_path.split("/")[-1].split(" ")
    if len(picture_name) > 2:
        return picture_name[-1]
    return ''


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
    entry['number_picture'] = len(photo_list)

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


def configure_table(request, table):
    per_page = request.GET.get("per_page", 25)
    try:
        # Vérifier si per_page est un entier valide
        per_page = int(per_page)
        if per_page <= 0:  # Sécurité pour éviter les valeurs invalides
            per_page = 25
    except ValueError:
        per_page = 25
    RequestConfig(request, paginate={"per_page": per_page}).configure(table)
    return table


def count_expression(group_by_field):
    """
    When grouping by species, count photos (distinct species would be 1 by
    construction). Otherwise, count distinct species in the group.
    """
    if group_by_field == "Espèce":
        return Count('id')
    return Count('specie_id', distinct=True)


def get_grouped_results(queryset, group_by_field):
    """
    Groupe les résultats par un champ spécifique et retourne le comptage
    """
    if group_by_field not in GROUP_BY_FIELDS:
        return None

    field = GROUP_BY_FIELDS[group_by_field]

    grouped = queryset.values(field).annotate(
        count=count_expression(group_by_field)
    ).order_by('-count')

    result = []
    for item in grouped:
        result.append({
            'name': item[field] or 'Non spécifié',
            'count': item['count']
        })

    return result


def get_comparison_results(base_queryset, group_by_field, collections):
    """
    Group `base_queryset` by `group_by_field` and pivot per collection.

    Returns (rows, columns) where:
      - `rows` is a list of dicts: {'name': value, 'collection_<id>': count, ...}
      - `columns` is the ordered list of (column_key, header_label) tuples,
        with the first column corresponding to the current/main collection.
    """
    if group_by_field not in GROUP_BY_FIELDS:
        return None, None

    field = GROUP_BY_FIELDS[group_by_field]

    column_keys = {collection.id: f"collection_{collection.id}" for collection in collections}

    grouped = (
        base_queryset
        .values(field, 'collection_id')
        .annotate(count=count_expression(group_by_field))
    )

    rows_by_name = {}
    totals_by_name = {}
    for item in grouped:
        name = item[field] or 'Non spécifié'
        collection_id = item['collection_id']
        column_key = column_keys.get(collection_id)
        if column_key is None:
            continue
        row = rows_by_name.setdefault(name, {'name': name})
        row[column_key] = item['count']
        totals_by_name[name] = totals_by_name.get(name, 0) + item['count']

    for row in rows_by_name.values():
        for column_key in column_keys.values():
            row.setdefault(column_key, 0)

    rows = sorted(
        rows_by_name.values(),
        key=lambda r: (-totals_by_name[r['name']], str(r['name'])),
    )
    columns = [(column_keys[collection.id], collection_label(collection)) for collection in collections]
    return rows, columns


def collection_label(collection):
    owner_username = getattr(collection.owner, 'username', '')
    if owner_username:
        return f"{collection.title} ({owner_username})"
    return collection.title


def resolve_compare_collections(user, raw_ids, current_collection):
    """
    Filter the requested compare collection ids to only those the user can
    access, exclude the current collection, and cap to MAX_COMPARE_COLLECTIONS.
    """
    from main.core.frontend.advanced_search.internal.forms import MAX_COMPARE_COLLECTIONS

    parsed_ids = []
    seen = set()
    for raw in raw_ids or []:
        try:
            value = int(raw)
        except (TypeError, ValueError):
            continue
        if value == current_collection.id or value in seen:
            continue
        seen.add(value)
        parsed_ids.append(value)
        if len(parsed_ids) >= MAX_COMPARE_COLLECTIONS:
            break

    if not parsed_ids:
        return []

    accessible = (
        user.collections
        .filter(id__in=parsed_ids)
        .select_related('owner')
    )
    by_id = {collection.id: collection for collection in accessible}
    return [by_id[i] for i in parsed_ids if i in by_id]


def apply_extra_filters(queryset, data):
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
    return queryset


def advanced_search_result(request, form):
    if request.user.current_collection:
        collection = request.user.current_collection
    else:
        collection = request.user.collections.all().first()

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
    grouped_table = None

    if form.is_valid():
        data = form.cleaned_data
        group_by = data.get("group_by")
        compare_collection_ids = data.get("compare_collections") or []

        if group_by:
            extra_collections = resolve_compare_collections(
                request.user, compare_collection_ids, collection
            )
        else:
            extra_collections = []

        all_collections = [collection] + extra_collections
        queryset = (
            Photos.objects.select_related('specie')
            .filter(collection__in=all_collections)
        )
        queryset = filter_queryset(queryset, form, filter_mappings)
        queryset = apply_extra_filters(queryset, data)

        if group_by:
            if extra_collections:
                rows, columns = get_comparison_results(
                    queryset, group_by, all_collections
                )
                table_class = make_comparison_table(columns)
                grouped_table = configure_table(request, table_class(rows))
                return {'group_by': group_by, 'is_comparison': True}, grouped_table, 0

            grouped_results = get_grouped_results(queryset, group_by)
            grouped_table = configure_table(request, GroupedResultsTable(grouped_results))
            return {'group_by': group_by}, grouped_table, 0
    else:
        queryset = Photos.objects.select_related('specie').filter(collection=collection)

    queryset = queryset.order_by('-specie__id')
    queryset = annotate_queryset(queryset)
    total_results = queryset.count()
    queryset = process_queryset(queryset)
    table = configure_table(request, SpeciesTable(queryset))

    return table, grouped_table, total_results
