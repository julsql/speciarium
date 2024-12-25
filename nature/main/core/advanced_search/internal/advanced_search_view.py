from main.core.advanced_search.internal.forms import SpeciesSearchForm


def advanced_search(request):
    form = SpeciesSearchForm(request.GET or None)
    continents = SpeciesSearchForm.continents
    years = SpeciesSearchForm.years
    countries = SpeciesSearchForm.countries
    regions = SpeciesSearchForm.regions
    return form, continents, years, countries, regions
