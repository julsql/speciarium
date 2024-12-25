from django.db import models

class Species(models.Model):
    latin_name = models.CharField(max_length=255, verbose_name="Nom latin")
    genus = models.CharField(max_length=255, verbose_name="Genre")
    species = models.CharField(max_length=255, verbose_name="Espèce")
    french_name = models.CharField(max_length=255, verbose_name="Nom français", blank=True)
    kingdom = models.CharField(max_length=255, verbose_name="Règne", blank=True)
    class_field = models.CharField(max_length=255, verbose_name="Classe", blank=True)
    order_field = models.CharField(max_length=255, verbose_name="Ordre", blank=True)
    family = models.CharField(max_length=255, verbose_name="Famille", blank=True)
    year = models.IntegerField(verbose_name="Année")
    date = models.CharField(max_length=255, verbose_name="Date")
    continent = models.CharField(max_length=255, verbose_name="Continent", blank=True)
    country = models.CharField(max_length=255, verbose_name="Pays")
    region = models.CharField(max_length=255, verbose_name="Région", blank=True)
    photo = models.CharField(max_length=255, verbose_name="Photo")
    thumbnail = models.CharField(max_length=255, verbose_name="Vignette")
    details = models.TextField(verbose_name="Détails", blank=True)

    def __str__(self):
        return self.latin_name
