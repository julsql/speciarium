from django import forms


class SpeciesSearchForm(forms.Form):
    latin_name = forms.CharField(max_length=255, required=False, label="Nom latin")
    genus = forms.CharField(max_length=255, required=False, label="Genre")
    species = forms.CharField(max_length=255, required=False, label="Espèce")
    french_name = forms.CharField(max_length=255, required=False, label="Nom français")
    kingdom = forms.CharField(max_length=255, required=False, label="Règne")
    class_field = forms.CharField(max_length=255, required=False, label="Classe")
    category = forms.CharField(max_length=255, required=False, label="Catégorie")
    year = forms.IntegerField(required=False, label="Année")
    day = forms.DateField(required=False, label="Jour")
    continent = forms.CharField(max_length=255, required=False, label="Continent")
    country = forms.CharField(max_length=255, required=False, label="Pays")
    region = forms.CharField(max_length=255, required=False, label="Région")
    place = forms.CharField(max_length=255, required=False, label="Lieu")
    title = forms.CharField(max_length=255, required=False, label="Titre")
    note = forms.CharField(widget=forms.Textarea, required=False, label="Note")
