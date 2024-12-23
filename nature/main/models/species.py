from django.db import models

class Species(models.Model):
    latin_name = models.CharField(max_length=255, verbose_name="Nom latin")
    genus = models.CharField(max_length=255, verbose_name="Genre")
    species = models.CharField(max_length=255, verbose_name="Espèce")
    french_name = models.CharField(max_length=255, verbose_name="Nom français", blank=True)
    kingdom = models.CharField(max_length=255, verbose_name="Règne", blank=True)
    class_field = models.CharField(max_length=255, verbose_name="Classe", blank=True)
    category = models.CharField(max_length=255, verbose_name="Categorie", blank=True)
    year = models.IntegerField(verbose_name="Année")
    day = models.CharField(max_length=255, verbose_name="Jour")
    continent = models.CharField(max_length=255, verbose_name="Continent", blank=True)
    country = models.CharField(max_length=255, verbose_name="Pays")
    region = models.CharField(max_length=255, verbose_name="Région", blank=True)
    photo = models.CharField(max_length=255, verbose_name="Photo")
    thumbnail = models.CharField(max_length=255, verbose_name="Vignette")
    note = models.TextField(verbose_name="Note", blank=True)

    def __str__(self):
        return self.latin_name
