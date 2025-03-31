from django.db import models

from main.models.country import Country


class Region(models.Model):
    name = models.CharField(max_length=3, verbose_name="Code")
    french_name = models.CharField(max_length=255, verbose_name="Région")
    country = models.ForeignKey(Country, on_delete=models.CASCADE)


    def __str__(self):
        return self.name
