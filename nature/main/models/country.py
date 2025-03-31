from django.db import models

from main.models.continent import Continent


class Country(models.Model):
    code = models.CharField(max_length=3, verbose_name="Code")
    name = models.CharField(max_length=255, verbose_name="Pays")
    continent = models.ForeignKey(Continent, on_delete=models.CASCADE)


    def __str__(self):
        return self.name
