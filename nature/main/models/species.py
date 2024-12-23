from django.db import models

class Species(models.Model):
    latin_name = models.CharField(max_length=255, verbose_name="Latin Name")
    genus = models.CharField(max_length=255, verbose_name="Genus", blank=True)
    species = models.CharField(max_length=255, verbose_name="Species", blank=True)
    french_name = models.CharField(max_length=255, verbose_name="French Name", blank=True)
    kingdom = models.CharField(max_length=255, verbose_name="Kingdom", blank=True)
    class_field = models.CharField(max_length=255, verbose_name="Class", blank=True)
    category = models.CharField(max_length=255, verbose_name="Category", blank=True)
    year = models.IntegerField(verbose_name="Year", blank=True)
    day = models.CharField(max_length=255, verbose_name="Day")
    continent = models.CharField(max_length=255, verbose_name="Continent")
    country = models.CharField(max_length=255, verbose_name="Country", blank=True)
    region = models.CharField(max_length=255, verbose_name="Region", blank=True)
    place = models.CharField(max_length=255, verbose_name="Place", blank=True)
    photo = models.CharField(max_length=255, verbose_name="Photo", blank=True)
    thumbnail = models.CharField(max_length=255, verbose_name="Thumbnail", blank=True, null=True)
    title = models.CharField(max_length=255, verbose_name="Title")
    note = models.TextField(verbose_name="Note", blank=True, null=True)

    def __str__(self):
        return self.latin_name
