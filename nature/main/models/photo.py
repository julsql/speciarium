from django.db import models

from main.models.species import Species


class Photos(models.Model):
    year = models.IntegerField(verbose_name="Année")
    date = models.CharField(max_length=255, verbose_name="Date")
    continent = models.CharField(max_length=255, verbose_name="Continent", blank=True)
    country = models.CharField(max_length=255, verbose_name="Pays")
    region = models.CharField(max_length=255, verbose_name="Région", blank=True)
    photo = models.CharField(max_length=255, verbose_name="Photo")
    thumbnail = models.CharField(max_length=255, verbose_name="Vignette")
    details = models.TextField(verbose_name="Détails", blank=True)
    specie = models.ForeignKey(Species, on_delete=models.CASCADE)

    def __str__(self):
        return self.photo
