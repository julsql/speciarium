from datetime import datetime

from django.contrib.auth.decorators import login_required
from django.http import HttpResponse, HttpRequest
from django.shortcuts import render
from django_tables2 import RequestConfig

from main.core.frontend.advanced_search.internal.advanced_search_view import advanced_search
from main.core.frontend.advanced_search_result.internal.advanced_search_result_view import filter_queryset
from main.core.frontend.carte.internal.table import MapTable
from main.models.photo import Photos


@login_required
def carte(request: HttpRequest) -> HttpResponse:
    form, continents, years, countries, regions = advanced_search(request)
    value = {'form': form,
             'continents': continents,
             'years': years,
             'countries': countries,
             'regions': regions}

    table, total_results = advanced_search_result_map(request, form)
    value.update({'table': table, 'total_results': total_results, 'page': "carte"})

    return render(request, 'carte/module.html', value)


def annotate_queryset(queryset):
    return queryset.values(
        'specie__latin_name', 'specie__genus', 'specie__species', 'specie__french_name',
        'specie__class_field', 'specie__order_field', 'specie__family', 'year',
        'continent', 'country', 'region', 'latitude', 'longitude', 'thumbnail', 'photo')


def advanced_search_result_map(request, form):
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


def convert_date_format(date):
    try:
        return datetime.strptime(date, '%Y-%m-%d').strftime('%d/%m/%Y')
    except ValueError:
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
    table = MapTable(queryset)
    RequestConfig(request, paginate={"per_page": per_page}).configure(table)
    return table


def process_queryset(queryset):
    return list(queryset)
