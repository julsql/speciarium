from django.db import models

from main.models.collection import Collection
from main.models.species import Species
from main.models.upload_action import UploadAction


class Photos(models.Model):
    year = models.IntegerField(verbose_name="Année", blank=True, null=True)
    date = models.DateField(verbose_name="Date", null=True, blank=True)
    latitude = models.FloatField(verbose_name="Latitude", null=True, blank=True)
    longitude = models.FloatField(verbose_name="Longitude", null=True, blank=True)
    continent = models.CharField(max_length=255, verbose_name="Continent", blank=True)
    country = models.CharField(max_length=255, verbose_name="Pays")
    region = models.CharField(max_length=255, verbose_name="Région", blank=True)
    specie = models.ForeignKey(Species, on_delete=models.CASCADE)
    photo = models.CharField(max_length=255, verbose_name="Photo")
    thumbnail = models.CharField(max_length=255, verbose_name="Vignette")
    hash = models.CharField(max_length=255, verbose_name="Hash")
    details = models.TextField(verbose_name="Détails", blank=True)
    collection = models.ForeignKey(Collection, on_delete=models.CASCADE, related_name='rows')
    upload_action = models.ForeignKey(UploadAction, on_delete=models.CASCADE, related_name='upload_action', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.photo
