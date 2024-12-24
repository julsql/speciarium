from django.db.models import Min

from django_tables2 import RequestConfig

from main.core.advanced_search_result.internal.group_concat import GroupConcat
from main.core.advanced_search_result.internal.table import SpeciesTable
from main.models.species import Species

def advanced_search_result(request, form):
    queryset = Species.objects.all()

    if form.is_valid():
        # Mapping of form field names to model field names
        filter_mappings = {
            'latin_name': 'latin_name__icontains',
            'genus': 'genus__icontains',
            'species': 'species__icontains',
            'french_name': 'french_name__icontains',
            'class_field': 'class_field__icontains',
            'order_field': 'order_field__icontains',
            'family': 'family__icontains',
            'year': 'year__icontains',
            'day': 'day__icontains',
            'continent': 'continent__icontains',
            'country': 'country__icontains',
            'region': 'region__icontains',
            'note': 'note__icontains',
        }

        # Dynamically filter the queryset based on form data
        for form_field, model_field in filter_mappings.items():
            value = form.cleaned_data.get(form_field)
            if value:
                queryset = queryset.filter(**{model_field: value})

    # Grouping and aggregation logic
    queryset = queryset.values(
        'latin_name', 'genus', 'species', 'french_name',
        'class_field', 'order_field', 'family'
    ).annotate(
        min_year=Min('year'),
        year_list=GroupConcat('year', delimiter=','),
        day_list=GroupConcat('day', delimiter=','),
        continent_list=GroupConcat('continent', delimiter=','),
        first_continent=Min('continent'),
        country_list=GroupConcat('country', delimiter=','),
        region_list=GroupConcat('region', delimiter=','),
        note_list=GroupConcat('note', delimiter=','),
        photo_list=GroupConcat('photo', delimiter=','),
        thumbnail_list=GroupConcat('thumbnail', delimiter=','),
    )

    total_results = queryset.count()
    queryset = list(queryset)

    for entry in queryset:
        images = []
        year_list = entry['year_list'].split(',')
        day_list = entry['day_list'].split(',')
        continent_list = entry['continent_list'].split(',')
        country_list = entry['country_list'].split(',')
        region_list = entry['region_list'].split(',')
        photo_list = entry['photo_list'].split(',')
        note_list = entry['note_list'].split(',')
        thumbnail_list = entry['thumbnail_list'].split(',')
        for i in range(len(year_list)):
            image = {'year': year_list[i],
                     'day': day_list[i],
                     'continent': continent_list[i],
                     'country': country_list[i],
                     'region': region_list[i],
                     'photo': photo_list[i],
                     'note': note_list[i],
                     'thumbnail': thumbnail_list[i]}
            images.append(image)

        entry['image1'] = images[0]
        entry['image2'] = images[1] if len(images) > 1 else None
        entry['image3'] = images[2] if len(images) > 2 else None
        if entry['day_list']:
            entry['day_list'] = set(day_list)
        if entry['continent_list']:
            entry['continent_list'] = set(continent_list)


    # Table rendering with pagination
    table = SpeciesTable(queryset)
    RequestConfig(request, paginate={"per_page": 10}).configure(table)
    return table, total_results
