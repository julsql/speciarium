from django import forms

from main.models.photo import Photos


class SpeciesSearchForm(forms.Form):
    latin_name = forms.CharField(max_length=255, required=False, label="Nom latin", widget=forms.TextInput(attrs={"class": "italic-field"}))
    french_name = forms.CharField(max_length=255, required=False, label="Nom vernaculaire")
    class_field = forms.CharField(max_length=255, required=False, label="Classe", widget=forms.TextInput(attrs={"class": "italic-field"}))
    order_field = forms.CharField(max_length=255, required=False, label="Ordre", widget=forms.TextInput(attrs={"class": "italic-field"}))
    family = forms.CharField(max_length=255, required=False, label="Famille")
    year = forms.IntegerField(required=False, label="Année", widget=forms.TextInput(attrs={'list': 'year-list'}))
    start_date = forms.DateField(required=False, label='Date de la prise de vue', widget=forms.DateInput(attrs={"type": "date"}))
    end_date = forms.DateField(required=False, widget=forms.DateInput(attrs={"type": "date"}))
    continent = forms.CharField(max_length=255, required=False, label="Continent", widget=forms.TextInput(attrs={'list': 'continent-list'}))
    country = forms.CharField(max_length=255, required=False, label="Pays", widget=forms.TextInput(attrs={'list': 'country-list'}))
    region = forms.CharField(max_length=255, required=False, label="Région", widget=forms.TextInput(attrs={'list': 'region-list'}))
    title = forms.CharField(max_length=255, required=False, label="Titre")
    details = forms.CharField(widget=forms.Textarea, required=False, label="Détails")

    continents = Photos.objects.values_list('continent', flat=True).distinct().order_by('continent')
    years = Photos.objects.values_list('year', flat=True).distinct().order_by('year')
    countries = Photos.objects.values_list('country', flat=True).distinct().order_by('country')
    regions = Photos.objects.values_list('region', flat=True).distinct().order_by('region')

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

        # Récupération dynamique des valeurs
        self.fields['continent'].widget.attrs['list'] = 'continent-list'
        self.fields['year'].widget.attrs['list'] = 'year-list'
        self.fields['country'].widget.attrs['list'] = 'country-list'
        self.fields['region'].widget.attrs['list'] = 'region-list'

        self.continents = Photos.objects.values_list('continent', flat=True).distinct().order_by('continent')
        self.years = Photos.objects.values_list('year', flat=True).distinct().order_by('year')
        self.countries = Photos.objects.values_list('country', flat=True).distinct().order_by('country')
        self.regions = Photos.objects.values_list('region', flat=True).distinct().order_by('region')


    def clean_continent(self):
        data = self.cleaned_data.get('continent')
        return data

    def clean_year(self):
        data = self.cleaned_data.get('year')
        return data

    def clean_country(self):
        data = self.cleaned_data.get('country')
        return data

    def clean_region(self):
        data = self.cleaned_data.get('region')
        return data