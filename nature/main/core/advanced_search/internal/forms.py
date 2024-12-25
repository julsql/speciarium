from django import forms


class SpeciesSearchForm(forms.Form):
    latin_name = forms.CharField(max_length=255, required=False, label="Nom latin")
    genus = forms.CharField(max_length=255, required=False, label="Genre")
    species = forms.CharField(max_length=255, required=False, label="Espèce")
    french_name = forms.CharField(max_length=255, required=False, label="Nom français")
    class_field = forms.CharField(max_length=255, required=False, label="Classe")
    order_field = forms.CharField(max_length=255, required=False, label="Ordre")
    family = forms.CharField(max_length=255, required=False, label="Famille")
    year = forms.IntegerField(required=False, label="Année")
    date = forms.CharField(max_length=255, required=False, label="Date")
    continent = forms.CharField(max_length=255, required=False, label="Continent")
    country = forms.CharField(max_length=255, required=False, label="Pays")
    region = forms.CharField(max_length=255, required=False, label="Région")
    title = forms.CharField(max_length=255, required=False, label="Titre")
    details = forms.CharField(widget=forms.Textarea, required=False, label="Détails")
