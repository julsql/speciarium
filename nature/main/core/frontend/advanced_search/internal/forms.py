from django import forms

from main.models.photo import Photos
from main.models.species import Species


class SpeciesSearchForm(forms.Form):
    latin_name = forms.CharField(max_length=255, required=False, label="Nom latin", widget=forms.TextInput(attrs={"class": "italic-field"}))
    french_name = forms.CharField(max_length=255, required=False, label="Nom vernaculaire")
    kingdom = forms.CharField(max_length=255, required=False, label="Règne", widget=forms.TextInput(attrs={"class": "italic-field", 'list': 'kingdom-list'}))
    class_field = forms.CharField(max_length=255, required=False, label="Classe", widget=forms.TextInput(attrs={"class": "italic-field", 'list': 'class-list'}))
    order_field = forms.CharField(max_length=255, required=False, label="Ordre", widget=forms.TextInput(attrs={"class": "italic-field", 'list': 'order-list'}))
    family = forms.CharField(max_length=255, required=False, label="Famille")
    year = forms.IntegerField(required=False, label="Année", widget=forms.TextInput(attrs={'list': 'year-list'}))
    start_date = forms.DateField(required=False, label='Date de la prise de vue', widget=forms.DateInput(attrs={"type": "date"}))
    end_date = forms.DateField(required=False, widget=forms.DateInput(attrs={"type": "date"}))
    continent = forms.CharField(max_length=255, required=False, label="Continent", widget=forms.TextInput(attrs={'list': 'continent-list'}))
    country = forms.CharField(max_length=255, required=False, label="Pays", widget=forms.TextInput(attrs={'list': 'country-list'}))
    region = forms.CharField(max_length=255, required=False, label="Région", widget=forms.TextInput(attrs={'list': 'region-list'}))
    title = forms.CharField(max_length=255, required=False, label="Titre")
    details = forms.CharField(widget=forms.Textarea, required=False, label="Détails")
    latitude = forms.FloatField(min_value=-90, max_value=90, required=False, label="Latitude")
    longitude = forms.FloatField(min_value=-180, max_value=180, required=False, label="Longitude")

    continents = []
    years = []
    countries = []
    regions = []
    kingdoms = []
    classes = []
    orders = []

    def __init__(self, form, collection_id, *args, **kwargs):
        super().__init__(form, *args, **kwargs)

        # Récupération dynamique des valeurs
        self.fields['continent'].widget.attrs['list'] = 'continent-list'
        self.fields['year'].widget.attrs['list'] = 'year-list'
        self.fields['country'].widget.attrs['list'] = 'country-list'
        self.fields['region'].widget.attrs['list'] = 'region-list'
        self.fields['kingdom'].widget.attrs['list'] = 'kingdom-list'
        self.fields['class_field'].widget.attrs['list'] = 'class-list'
        self.fields['order_field'].widget.attrs['list'] = 'order-list'

        self.continents = Photos.objects.filter(collection_id=collection_id).values_list('continent', flat=True).distinct().order_by('continent')
        self.years = Photos.objects.filter(collection_id=collection_id).values_list('year', flat=True).distinct().order_by('year')
        self.countries = Photos.objects.filter(collection_id=collection_id).values_list('country', flat=True).distinct().order_by('country')
        self.regions = Photos.objects.filter(collection_id=collection_id).values_list('region', flat=True).distinct().order_by('region')

        specie_ids_of_collection = Photos.objects.filter(collection_id=collection_id).values_list('specie_id', flat=True)

        self.kingdoms = Species.objects.filter(id__in=specie_ids_of_collection).values_list('kingdom', flat=True).distinct().order_by('kingdom')
        self.classes = Species.objects.filter(id__in=specie_ids_of_collection).values_list('class_field', flat=True).distinct().order_by('class_field')
        self.orders = Species.objects.filter(id__in=specie_ids_of_collection).values_list('order_field', flat=True).distinct().order_by('order_field')


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

    def clean_kingdom(self):
        data = self.cleaned_data.get('kingdom')
        return data

    def clean_order(self):
        data = self.cleaned_data.get('order_field')
        return data

    def clean_class(self):
        data = self.cleaned_data.get('class_field')
        return data