from django.contrib.auth.decorators import login_required
from django.db.models.functions import Round
from django.http import HttpResponse, HttpRequest
from django.shortcuts import render

from main.core.frontend.advanced_search.internal.advanced_search_view import advanced_search
from main.core.frontend.advanced_search_result.internal.advanced_search_result_view import filter_queryset
from main.models.photo import Photos


@login_required
def carte(request: HttpRequest) -> HttpResponse:
    form, continents, years, countries, regions = advanced_search(request)
    value = {'form': form,
             'continents': continents,
             'years': years,
             'countries': countries,
             'regions': regions}

    results, total_results = advanced_search_result_map(form)
    value.update({'results': results, 'total_results': total_results, 'page': "photos"})

    return render(request, 'carte/module.html', value)


def annotate_queryset(queryset):
    return queryset.values(
        'specie__latin_name', 'specie__genus', 'specie__species', 'specie__french_name',
        'specie__class_field', 'specie__order_field', 'specie__family', 'year', "date",
        'continent', 'country', 'region', 'latitude', 'longitude', 'thumbnail', 'photo')


def advanced_search_result_map(form):
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

    return queryset, total_results


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
    queryset = list(queryset)
    for entry in queryset:
        transform_entry(entry)
    return queryset


def transform_entry(entry):
    entry['date'] = convert_date_format(entry['date'])
    entry['coordinates'] = convert_coordinates(entry['latitude'], entry['longitude'])
    entry['latitude'] = entry['latitude'] if entry['latitude'] else '""'
    entry['longitude'] = entry['longitude'] if entry['longitude'] else '""'
    return entry
