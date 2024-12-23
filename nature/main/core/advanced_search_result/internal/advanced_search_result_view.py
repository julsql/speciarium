from django_tables2 import RequestConfig

from main.core.advanced_search_result.internal.table import SpeciesTable
from main.models.species import Species


def advanced_search_result(request, form):

        queryset = Species.objects.all()

        # Filtrer en fonction des critères du formulaire
        if form.is_valid():
                if form.cleaned_data.get('latin_name'):
                        queryset = queryset.filter(latin_name__icontains=form.cleaned_data['latin_name'])
                if form.cleaned_data.get('genus'):
                        queryset = queryset.filter(genus__icontains=form.cleaned_data['genus'])
                if form.cleaned_data.get('species'):
                        queryset = queryset.filter(species__icontains=form.cleaned_data['species'])
                if form.cleaned_data.get('french_name'):
                        queryset = queryset.filter(french_name__icontains=form.cleaned_data['french_name'])
                if form.cleaned_data.get('kingdom'):
                        queryset = queryset.filter(kingdom__icontains=form.cleaned_data['kingdom'])
                if form.cleaned_data.get('class_field'):
                        queryset = queryset.filter(class_field__icontains=form.cleaned_data['class_field'])
                if form.cleaned_data.get('category'):
                        queryset = queryset.filter(category__icontains=form.cleaned_data['category'])
                if form.cleaned_data.get('year'):
                        queryset = queryset.filter(year__icontains=form.cleaned_data['year'])
                if form.cleaned_data.get('day'):
                        queryset = queryset.filter(day__icontains=form.cleaned_data['day'])
                if form.cleaned_data.get('continent'):
                        queryset = queryset.filter(continent__icontains=form.cleaned_data['continent'])
                if form.cleaned_data.get('country'):
                        queryset = queryset.filter(country__icontains=form.cleaned_data['country'])
                if form.cleaned_data.get('region'):
                        queryset = queryset.filter(region__icontains=form.cleaned_data['region'])
                if form.cleaned_data.get('place'):
                        queryset = queryset.filter(place__icontains=form.cleaned_data['place'])
                if form.cleaned_data.get('title'):
                        queryset = queryset.filter(title__icontains=form.cleaned_data['title'])
                if form.cleaned_data.get('note'):
                        queryset = queryset.filter(note__icontains=form.cleaned_data['note'])
        table = SpeciesTable(queryset)
        RequestConfig(request, paginate={"per_page": 10}).configure(table)
        return table