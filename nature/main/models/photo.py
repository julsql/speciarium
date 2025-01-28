from django.db import models

from main.models.species import Species


class Photos(models.Model):
    year = models.IntegerField(verbose_name="Année", blank=True, null=True)
    date = models.CharField(max_length=255, verbose_name="Date", blank=True)
    continent = models.CharField(max_length=255, verbose_name="Continent", blank=True)
    country = models.CharField(max_length=255, verbose_name="Pays")
    region = models.CharField(max_length=255, verbose_name="Région", blank=True)
    specie = models.ForeignKey(Species, on_delete=models.CASCADE)
    photo = models.CharField(max_length=255, verbose_name="Photo")
    thumbnail = models.CharField(max_length=255, verbose_name="Vignette")
    hash = models.CharField(max_length=255, verbose_name="Hash")
    details = models.TextField(verbose_name="Détails", blank=True)

    def __str__(self):
        return self.photo
