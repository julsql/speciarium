import django_tables2 as tables
from main.models.species import Species

class SpeciesTable(tables.Table):
    latin_name = tables.Column(verbose_name="Nom latin")
    genus = tables.Column(verbose_name="Genre")
    species = tables.Column(verbose_name="Espèce")
    french_name = tables.Column(verbose_name="Nom français")
    kingdom = tables.Column(verbose_name="Règne")
    class_field = tables.Column(verbose_name="Classe")
    category = tables.Column(verbose_name="Catégorie")
    year = tables.Column(verbose_name="Année")
    day = tables.Column(verbose_name="Jour")
    continent = tables.Column(verbose_name="Continent")
    country = tables.Column(verbose_name="Pays")
    region = tables.Column(verbose_name="Région")
    thumbnail = tables.TemplateColumn(
        template_code='''
            <a href="{{ record.photo }}" target="_blank">
                <img src="{{ record.thumbnail }}" alt="Thumbnail" style="max-height: 100px;">
            </a>
            {% if record.note %}
                <p>{{ record.note }}</p>
            {% endif %}
        ''',
        verbose_name="Aperçu"
    )

    class Meta:
            model = Species
            template_name = "django_tables2/bootstrap.html"
            fields = ("latin_name", "genus", "species",
                      "french_name", "kingdom", "class_field",
                      "category", "year", "day",
                      "continent", "country", "region", "thumbnail")
